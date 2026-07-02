// Arma la cola diaria de la pantalla Hoy: junta libros, tarjetas candidatas (due ≤ fin del día) y las
// nuevas ya introducidas hoy, y delega el cálculo a `buildDailyQueue` (puro). Expone el resultado por
// signals. No conoce Firestore. La cola resultante se entrega a `ReviewService.startWith`.

import { Injectable, inject, signal } from '@angular/core';

import { CardRepository, DailyStatsRepository } from '@domain/ports';
import type { Card, DailyStats, User } from '@domain/models';
import { AuthService } from '@services/auth.service';
import { BooksService } from '@services/books.service';
import { requireSessionUser } from '@services/session';
import { type BookPending, buildDailyQueue } from './daily-queue';
import { endOfStudyDay, studyDayId } from './study-day';

export type QueueStatus = 'idle' | 'loading' | 'ready' | 'error';

@Injectable({ providedIn: 'root' })
export class QueueService {
  private readonly cardRepository = inject(CardRepository);
  private readonly dailyStatsRepository = inject(DailyStatsRepository);
  private readonly booksService = inject(BooksService);
  private readonly authService = inject(AuthService);

  private readonly statusSignal = signal<QueueStatus>('idle');
  private readonly queueSignal = signal<Card[]>([]);
  private readonly dueCountSignal = signal(0);
  private readonly newCountSignal = signal(0);
  private readonly availableNewSignal = signal(0);
  private readonly perBookSignal = signal<BookPending[]>([]);
  // Stats del día leídas al armar la cola; se exponen para que otros lectores (Progreso)
  // no repitan la misma lectura de Firestore.
  private readonly todayStatsSignal = signal<DailyStats | null>(null);
  private readonly errorMessageSignal = signal<string | null>(null);

  readonly status = this.statusSignal.asReadonly();
  readonly queue = this.queueSignal.asReadonly();
  readonly dueCount = this.dueCountSignal.asReadonly();
  readonly newCount = this.newCountSignal.asReadonly();
  readonly availableNew = this.availableNewSignal.asReadonly();
  readonly perBook = this.perBookSignal.asReadonly();
  readonly todayStats = this.todayStatsSignal.asReadonly();
  readonly errorMessage = this.errorMessageSignal.asReadonly();

  // Datos de la última carga, para recomputar la cola al cambiar el límite de nuevas sin re-consultar.
  private cache: {
    candidates: Card[];
    introducedByBook: Record<string, number>;
    reviewedByBook: Record<string, number>;
  } | null = null;

  /** Carga y arma la cola del día. Maneja el error de forma visible (contrato). */
  async load(): Promise<void> {
    this.statusSignal.set('loading');
    this.errorMessageSignal.set(null);
    try {
      const user = this.requireUser();
      const { timezone, dayStartHour } = user.settings;
      const endOfDay = endOfStudyDay(new Date(), timezone, dayStartHour);
      const dateId = studyDayId(new Date(), timezone, dayStartHour);

      await this.booksService.ensureLoaded();
      const [candidates, todayStats] = await Promise.all([
        this.cardRepository.listDue(user.id, endOfDay),
        this.dailyStatsRepository.getToday(user.id, dateId),
      ]);

      this.todayStatsSignal.set(todayStats);
      this.cache = {
        candidates,
        introducedByBook: todayStats?.newCardsIntroduced ?? {},
        reviewedByBook: todayStats?.reviewsCompletedByBook ?? {},
      };
      this.applyQueue(
        buildDailyQueue(
          candidates,
          this.booksService.books(),
          this.cache.introducedByBook,
          this.cache.reviewedByBook,
        ),
      );
      this.statusSignal.set('ready');
    } catch (error) {
      console.error('No se pudo armar la cola del día', error);
      this.errorMessageSignal.set('No se pudo cargar tu cola de hoy.');
      this.statusSignal.set('error');
    }
  }

  /** Override de sesión: recomputa la cola con un límite total de nuevas (sin re-consultar). */
  applyNewLimit(newLimit: number): void {
    if (this.cache === null) {
      return;
    }
    this.applyQueue(
      buildDailyQueue(
        this.cache.candidates,
        this.booksService.books(),
        this.cache.introducedByBook,
        this.cache.reviewedByBook,
        Math.max(0, newLimit),
      ),
    );
  }

  private applyQueue(queue: ReturnType<typeof buildDailyQueue>): void {
    this.queueSignal.set(queue.cards);
    this.dueCountSignal.set(queue.dueCount);
    this.newCountSignal.set(queue.newCount);
    this.availableNewSignal.set(queue.availableNewCount);
    this.perBookSignal.set(queue.perBook);
  }

  private requireUser(): User {
    return requireSessionUser(this.authService.currentUser());
  }
}
