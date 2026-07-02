// Reúne las métricas de la pantalla Progreso (§8.7): pendientes hoy y stats del día (ambos ya
// cargados por QueueService — no se repite ninguna lectura), y estado de la colección (conteo
// agregado por estado). No conoce Firestore. Es lectura/agregación; el "cerebro" pesado vive en
// la cola y el scheduler.

import { Injectable, computed, inject, signal } from '@angular/core';

import { CardRepository, type CardStateCounts } from '@domain/ports';
import type { RatingCounts, User } from '@domain/models';
import { AuthService } from '@services/auth.service';
import { requireSessionUser } from '@services/session';
import { QueueService } from '@services/review';

export type ProgressStatus = 'idle' | 'loading' | 'ready' | 'error';

const EMPTY_RATING_COUNTS: RatingCounts = { again: 0, hard: 0, good: 0, easy: 0 };
const EMPTY_COLLECTION: CardStateCounts = { newCards: 0, learning: 0, review: 0 };

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly cardRepository = inject(CardRepository);
  private readonly queueService = inject(QueueService);
  private readonly authService = inject(AuthService);

  private readonly statusSignal = signal<ProgressStatus>('idle');
  private readonly pendingDueSignal = signal(0);
  private readonly pendingNewSignal = signal(0);
  private readonly reviewsTodaySignal = signal(0);
  private readonly ratingCountsSignal = signal<RatingCounts>({ ...EMPTY_RATING_COUNTS });
  private readonly collectionSignal = signal<CardStateCounts>({ ...EMPTY_COLLECTION });
  private readonly errorMessageSignal = signal<string | null>(null);

  readonly status = this.statusSignal.asReadonly();
  readonly pendingDue = this.pendingDueSignal.asReadonly();
  readonly pendingNew = this.pendingNewSignal.asReadonly();
  readonly reviewsToday = this.reviewsTodaySignal.asReadonly();
  readonly ratingCounts = this.ratingCountsSignal.asReadonly();
  readonly collection = this.collectionSignal.asReadonly();
  readonly errorMessage = this.errorMessageSignal.asReadonly();

  readonly totalCards = computed(() => {
    const collection = this.collectionSignal();
    return collection.newCards + collection.learning + collection.review;
  });

  /** True cuando no hay tarjetas todavía: la pantalla muestra el estado vacío que promete el valor. */
  readonly isEmpty = computed(() => this.totalCards() === 0);

  /** Carga todas las métricas. Maneja el error de forma visible (contrato). */
  async load(): Promise<void> {
    this.statusSignal.set('loading');
    this.errorMessageSignal.set(null);
    try {
      const user = this.requireUser();

      // La cola ya lee las stats del día: se reusan en vez de volver a pedirlas a Firestore.
      await this.queueService.load();
      if (this.queueService.status() === 'error') {
        // La cola maneja su error internamente (no lanza); sin ella los pendientes serían
        // basura, así que Progreso también se muestra en error en vez de fingir datos.
        throw new Error('La cola del día no se pudo cargar.');
      }
      const todayStats = this.queueService.todayStats();
      const collection = await this.cardRepository.countByState(user.id);

      this.pendingDueSignal.set(this.queueService.dueCount());
      this.pendingNewSignal.set(this.queueService.newCount());
      this.reviewsTodaySignal.set(todayStats?.reviewsCompleted ?? 0);
      this.ratingCountsSignal.set(todayStats?.ratingCounts ?? { ...EMPTY_RATING_COUNTS });
      this.collectionSignal.set(collection);
      this.statusSignal.set('ready');
    } catch (error) {
      console.error('No se pudieron cargar las estadísticas', error);
      this.errorMessageSignal.set('No se pudieron cargar tus estadísticas.');
      this.statusSignal.set('error');
    }
  }

  private requireUser(): User {
    return requireSessionUser(this.authService.currentUser());
  }
}
