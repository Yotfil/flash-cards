// Reúne las métricas de la pantalla Progreso (§8.7): pendientes hoy (de la cola), repasadas hoy y
// distribución de calificaciones (de dailyStats), y estado de la colección (conteo por estado). No
// conoce Firestore. Es lectura/agregación; el "cerebro" pesado vive en la cola y el scheduler.

import { Injectable, computed, inject, signal } from '@angular/core';

import { CardRepository, DailyStatsRepository, type CardStateCounts } from '@domain/ports';
import type { RatingCounts, User } from '@domain/models';
import { AuthService } from '@services/auth.service';
import { requireSessionUser } from '@services/session';
import { QueueService, studyDayId } from '@services/review';

export type ProgressStatus = 'idle' | 'loading' | 'ready' | 'error';

const EMPTY_RATING_COUNTS: RatingCounts = { again: 0, hard: 0, good: 0, easy: 0 };
const EMPTY_COLLECTION: CardStateCounts = { newCards: 0, learning: 0, review: 0 };

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly cardRepository = inject(CardRepository);
  private readonly dailyStatsRepository = inject(DailyStatsRepository);
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
      const dateId = studyDayId(new Date(), user.settings.timezone, user.settings.dayStartHour);

      await this.queueService.load();
      const [todayStats, collection] = await Promise.all([
        this.dailyStatsRepository.getToday(user.id, dateId),
        this.cardRepository.countByState(user.id),
      ]);

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
