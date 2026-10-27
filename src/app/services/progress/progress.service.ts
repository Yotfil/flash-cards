import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import type { CardStateTotals } from '@domain/models/book.model';
import { BookRepository } from '@domain/ports/book.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { DailyQueueService } from '@services/queue/daily-queue.service';
import { SessionService } from '@services/session/session.service';

import { CardCollectionChanges } from './card-collection-changes';
import { collectionShares, type CollectionShares } from './collection-shares';
import { ratingRows } from './rating-rows';

export type CollectionStatus = 'offline' | 'loading' | 'error' | 'ready';

/** Un conteo de la colección: de qué cuenta es y con qué versión de la colección se hizo. */
interface CollectionCount {
  readonly uid: string;
  readonly version: number;
  readonly totals: CardStateTotals;
}

/** Un conteo pedido y aún sin respuesta. */
interface CountRequest {
  readonly uid: string;
  readonly version: number;
}

// Progreso: el día sale de la cola de Hoy (su base, sin el ajuste de la sesión) y de su contador,
// sin leer nada más; la colección son tres conteos agregados aparte, para que su fallo o su espera
// no tumben los paneles del día. Las agregaciones solo existen con red y siempre se cobran: el
// conteo se guarda en memoria y solo se repite si la colección cambió desde este dispositivo, si la
// cuenta es otra o si el usuario lo pide con "Reintentar".
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly queue = inject(DailyQueueService);
  private readonly books = inject(BookRepository);
  private readonly session = inject(SessionService);
  private readonly online = inject(ConnectivityPort).online;
  private readonly changes = inject(CardCollectionChanges);
  private readonly logger = inject(Logger);

  /** El último conteo bueno: se sigue mostrando sin red y mientras se vuelve a contar. */
  private readonly lastCount = signal<CollectionCount | null>(null);
  private readonly lastCountFailed = signal(false);
  /** El conteo en curso: evita pedir dos veces el mismo y descarta la respuesta de uno ya superado. */
  private pendingCount: CountRequest | null = null;
  /** Progreso está abierta: solo entonces la red que vuelve dispara el conteo. */
  private readonly open = signal(false);

  constructor() {
    // Depende solo de estar abierta y de la red: un conteo fallido no se repite solo (para eso está
    // "Reintentar"), pero sí al volver la red con Progreso a la vista.
    effect(() => {
      if (this.open() && this.online()) {
        untracked(() => this.ensureCounted());
      }
    });
  }

  readonly dayStatus = this.queue.status;
  readonly pending = computed(() => this.queue.baseQueue().cards.length);
  readonly reviewedToday = computed(() => this.queue.todayStats()?.reviewsCompleted ?? 0);
  readonly ratings = computed(() => ratingRows(this.queue.todayStats()));

  /** El conteo de la cuenta activa; `null` si nunca se contó o si el que hay es de otra cuenta. */
  private readonly counts = computed<CardStateTotals | null>(() => {
    const count = this.lastCount();
    return count && count.uid === this.session.user()?.id ? count.totals : null;
  });

  readonly collectionStatus = computed<CollectionStatus>(() => {
    const counts = this.counts();
    if (!this.online()) {
      return counts ? 'ready' : 'offline';
    }
    if (this.lastCountFailed()) {
      return 'error';
    }
    return counts ? 'ready' : 'loading';
  });
  readonly shares = computed<CollectionShares | null>(() => {
    const counts = this.counts();
    return counts ? collectionShares(counts) : null;
  });
  /** El vacío solo se decide con el conteo en la mano: sin él (sin red o fallido) nunca. */
  readonly isEmpty = computed(
    () => this.collectionStatus() === 'ready' && this.shares()?.total === 0,
  );

  /** Entra a Progreso: arma el día, cuenta si hace falta y queda atenta a la red que vuelve. */
  enter(): void {
    this.open.set(true);
    this.refresh();
  }

  /** Sale de Progreso: desde aquí, la red que vuelve ya no cuenta la colección. */
  leave(): void {
    this.open.set(false);
  }

  /** Cada visita: rearma la cola del día (sin la racha) y cuenta la colección solo si hace falta. */
  refresh(): void {
    this.queue.refreshQueue();
    this.ensureCounted();
  }

  /** "Reintentar" de toda la pantalla: la cola y el conteo, aunque nada haya cambiado. */
  retry(): void {
    this.queue.refreshQueue();
    void this.count();
  }

  /** "Reintentar" de la sección: repite solo el conteo, sin tocar los paneles del día. */
  retryCollection(): void {
    void this.count();
  }

  /** Cuenta si no hay un conteo de esta cuenta para la versión actual de la colección. */
  private ensureCounted(): void {
    const uid = this.session.user()?.id;
    if (!uid) {
      return;
    }
    const version = this.changes.version();
    const isCurrent = (count: CountRequest | null) =>
      count !== null && count.uid === uid && count.version === version;
    if (isCurrent(this.lastCount()) || isCurrent(this.pendingCount)) {
      return;
    }
    void this.count();
  }

  private async count(): Promise<void> {
    const uid = this.session.user()?.id;
    if (!uid || !this.online()) {
      return;
    }
    const request: CountRequest = { uid, version: this.changes.version() };
    this.pendingCount = request;
    try {
      const totals = await this.books.countCollectionByState(uid);
      if (this.pendingCount === request) {
        this.lastCount.set({ ...request, totals });
        this.lastCountFailed.set(false);
      }
    } catch (error) {
      // La sección pinta "No pudimos contar tu colección."; aquí queda el detalle.
      this.logger.error('No se pudo contar la colección', error);
      if (this.pendingCount === request) {
        this.lastCountFailed.set(true);
      }
    } finally {
      if (this.pendingCount === request) {
        this.pendingCount = null;
      }
    }
  }
}
