import { Injectable, computed, inject, resource, signal } from '@angular/core';

import { BookRepository } from '@domain/ports/book.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { DailyQueueService } from '@services/queue/daily-queue.service';
import { SessionService } from '@services/session/session.service';

import { collectionShares, type CollectionShares } from './collection-shares';
import { ratingRows } from './rating-rows';

export type CollectionStatus = 'offline' | 'loading' | 'error' | 'ready';

// Progreso: el día sale de la cola de Hoy (su base, sin el ajuste de la sesión) y de su contador,
// sin leer nada más; la colección son tres conteos agregados aparte, para que su fallo o su espera
// no tumben los paneles del día. Las agregaciones solo existen con red: sin ella ni se piden.
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly queue = inject(DailyQueueService);
  private readonly books = inject(BookRepository);
  private readonly session = inject(SessionService);
  private readonly online = inject(ConnectivityPort).online;
  private readonly logger = inject(Logger);

  /** La colección se cuenta desde la primera visita, no al crear el servicio. */
  private readonly collectionRequested = signal(false);

  readonly collection = resource({
    params: () => {
      const uid = this.session.user()?.id;
      return this.collectionRequested() && this.online() && uid ? { uid } : undefined;
    },
    loader: async ({ params }) => {
      try {
        return await this.books.countCollectionByState(params.uid);
      } catch (error) {
        // La sección pinta "No pudimos contar tu colección."; aquí queda el detalle.
        this.logger.error('No se pudo contar la colección', error);
        throw error;
      }
    },
  });

  readonly dayStatus = this.queue.status;
  readonly pending = computed(() => this.queue.baseQueue().cards.length);
  readonly reviewedToday = computed(() => this.queue.todayStats()?.reviewsCompleted ?? 0);
  readonly ratings = computed(() => ratingRows(this.queue.todayStats()));

  readonly collectionStatus = computed<CollectionStatus>(() => {
    if (!this.online()) {
      return 'offline';
    }
    if (this.collection.status() === 'error') {
      return 'error';
    }
    return this.collection.hasValue() && this.collection.value() ? 'ready' : 'loading';
  });
  readonly shares = computed<CollectionShares | null>(() => {
    const counts = this.collection.hasValue() ? this.collection.value() : undefined;
    return counts ? collectionShares(counts) : null;
  });
  /** El vacío solo se decide con el conteo en la mano: sin él (sin red o fallido) nunca. */
  readonly isEmpty = computed(
    () => this.collectionStatus() === 'ready' && this.shares()?.total === 0,
  );

  /** Cada visita: rearma la cola del día y vuelve a contar la colección. */
  refresh(): void {
    this.queue.refresh();
    if (this.collectionRequested()) {
      this.collection.reload();
    } else {
      this.collectionRequested.set(true);
    }
  }

  /** "Reintentar" de la sección: repite solo el conteo, sin tocar los paneles del día. */
  retryCollection(): void {
    this.collection.reload();
  }
}
