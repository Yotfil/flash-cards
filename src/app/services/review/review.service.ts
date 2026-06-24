// Orquesta la sesión de repaso: arma la cola, lleva el progreso, y al calificar pasa la tarjeta por
// el SchedulingPort (ts-fsrs) y persiste el resultado en tres sitios: la tarjeta (nuevo scheduling),
// `reviewLogs` (append-only) y `dailyStats`. No conoce Firestore ni ts-fsrs. El `uid` y la zona
// horaria salen de la sesión (AuthService).

import { Injectable, computed, inject, signal } from '@angular/core';

import {
  CardRepository,
  DailyStatsRepository,
  ReviewLogRepository,
  SchedulingPort,
  type RatingOutcome,
} from '@domain/ports';
import type { Card, Rating, RatingCounts, User } from '@domain/models';
import { AuthService } from '@services/auth.service';
import { studyDayId } from './study-day';
import { suggestRatingByLatency } from './suggest-rating';

export type ReviewStatus = 'idle' | 'active' | 'finished';

const EMPTY_RATING_COUNTS: RatingCounts = { again: 0, hard: 0, good: 0, easy: 0 };
const RATING_NAME: Record<Rating, keyof RatingCounts> = {
  1: 'again',
  2: 'hard',
  3: 'good',
  4: 'easy',
};

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly cardRepository = inject(CardRepository);
  private readonly schedulingPort = inject(SchedulingPort);
  private readonly reviewLogRepository = inject(ReviewLogRepository);
  private readonly dailyStatsRepository = inject(DailyStatsRepository);
  private readonly authService = inject(AuthService);

  private readonly statusSignal = signal<ReviewStatus>('idle');
  private readonly queueSignal = signal<Card[]>([]);
  private readonly indexSignal = signal(0);
  private readonly revealedSignal = signal(false);
  // Grado sugerido por la velocidad de recuerdo (null = sin sugerencia: setting off o sin revelar).
  private readonly suggestedRatingSignal = signal<Rating | null>(null);
  private readonly previewsSignal = signal<Record<Rating, RatingOutcome> | null>(null);
  private readonly reviewedSignal = signal(0);
  private readonly ratingCountsSignal = signal<RatingCounts>({ ...EMPTY_RATING_COUNTS });
  private readonly errorMessageSignal = signal<string | null>(null);

  readonly status = this.statusSignal.asReadonly();
  readonly revealed = this.revealedSignal.asReadonly();
  readonly suggestedRating = this.suggestedRatingSignal.asReadonly();
  readonly previews = this.previewsSignal.asReadonly();
  readonly errorMessage = this.errorMessageSignal.asReadonly();
  readonly current = computed<Card | null>(() => this.queueSignal()[this.indexSignal()] ?? null);
  readonly total = computed(() => this.queueSignal().length);
  readonly position = computed(() => Math.min(this.indexSignal() + 1, this.total()));
  readonly summary = computed(() => ({
    reviewed: this.reviewedSignal(),
    ratingCounts: this.ratingCountsSignal(),
  }));

  /** Cuándo se mostró la tarjeta actual, para medir el tiempo de respuesta (durationMs). */
  private cardShownAt = 0;
  /** Evita calificar dos veces la misma tarjeta por un doble toque/tecla mientras se guarda. */
  private grading = false;

  /** Arranca una sesión con las tarjetas LISTAS de un libro. Devuelve cuántas hay (0 = no entrar). */
  async startBook(bookId: string): Promise<number> {
    return this.start(() => this.cardRepository.listByBook(this.requireUser().id, bookId));
  }

  /** Arranca una sesión con las tarjetas LISTAS de un capítulo. Devuelve cuántas hay. */
  async startChapter(chapterId: string): Promise<number> {
    return this.start(() => this.cardRepository.listByChapter(this.requireUser().id, chapterId));
  }

  /** Arranca una sesión con una lista YA curada (p. ej. la cola diaria de Hoy). No re-filtra. */
  startWith(cards: Card[]): number {
    this.errorMessageSignal.set(null);
    if (cards.length === 0) {
      return 0;
    }
    return this.beginSession(cards);
  }

  /** Revela la respuesta y, si el ajuste está activo, calcula el grado sugerido por la latencia de
   *  recuerdo (anverso → revelar). Idempotente: una segunda llamada no recalcula. */
  reveal(): void {
    if (this.revealedSignal()) {
      return;
    }
    this.revealedSignal.set(true);
    const latencyMs = Date.now() - this.cardShownAt;
    const autoGrade = this.authService.currentUser()?.settings.autoGradeByTime ?? false;
    this.suggestedRatingSignal.set(autoGrade ? suggestRatingByLatency(latencyMs) : null);
  }

  /** Califica la tarjeta actual con un grado 1-4: persiste, registra y avanza. */
  async grade(rating: Rating): Promise<void> {
    const card = this.current();
    const previews = this.previewsSignal();
    if (this.grading || this.statusSignal() !== 'active' || card === null || previews === null) {
      return;
    }
    this.grading = true;
    const outcome = previews[rating];
    const user = this.requireUser();
    const now = new Date();
    const durationMs = Date.now() - this.cardShownAt;

    try {
      await this.cardRepository.updateScheduling(user.id, card.id, outcome.scheduling);
      await this.reviewLogRepository.append(user.id, {
        cardId: card.id,
        bookId: card.bookId,
        rating,
        state: card.scheduling.state, // estado ANTES del repaso
        due: outcome.log.due,
        stability: outcome.log.stability,
        difficulty: outcome.log.difficulty,
        elapsedDays: outcome.log.elapsedDays,
        lastElapsedDays: outcome.log.lastElapsedDays,
        scheduledDays: outcome.log.scheduledDays,
        reviewedAt: now,
        durationMs,
      });
      const dateId = studyDayId(now, user.settings.timezone, user.settings.dayStartHour);
      await this.dailyStatsRepository.recordReview(user.id, dateId, {
        rating,
        bookId: card.bookId,
        wasNew: card.scheduling.state === 0, // CardState.New
      });
    } catch (error) {
      console.error('No se pudo guardar la calificación', error);
      this.errorMessageSignal.set('No se pudo guardar la calificación. Inténtalo de nuevo.');
      this.grading = false;
      return;
    }

    this.reviewedSignal.update((value) => value + 1);
    this.ratingCountsSignal.update((counts) => ({
      ...counts,
      [RATING_NAME[rating]]: counts[RATING_NAME[rating]] + 1,
    }));
    this.advance();
    this.grading = false;
  }

  private async start(load: () => Promise<Card[]>): Promise<number> {
    this.errorMessageSignal.set(null);
    let ready: Card[];
    try {
      ready = this.filterReady(await load());
    } catch (error) {
      console.error('No se pudieron cargar las tarjetas para estudiar', error);
      this.errorMessageSignal.set('No se pudieron cargar las tarjetas.');
      return 0;
    }
    if (ready.length === 0) {
      return 0;
    }
    return this.beginSession(ready);
  }

  private beginSession(cards: Card[]): number {
    this.queueSignal.set(cards);
    this.indexSignal.set(0);
    this.reviewedSignal.set(0);
    this.ratingCountsSignal.set({ ...EMPTY_RATING_COUNTS });
    this.statusSignal.set('active');
    this.showCurrent();
    return cards.length;
  }

  /** Tarjetas listas para estudiar: nuevas o vencidas (due ≤ ahora). */
  private filterReady(cards: Card[]): Card[] {
    const now = Date.now();
    return cards.filter(
      (card) => card.scheduling.state === 0 || card.scheduling.due.getTime() <= now,
    );
  }

  private advance(): void {
    this.indexSignal.update((value) => value + 1);
    if (this.indexSignal() >= this.total()) {
      this.statusSignal.set('finished');
      this.previewsSignal.set(null);
      this.suggestedRatingSignal.set(null);
    } else {
      this.showCurrent();
    }
  }

  private showCurrent(): void {
    const card = this.current();
    if (card === null) {
      return;
    }
    this.revealedSignal.set(false);
    this.suggestedRatingSignal.set(null);
    this.previewsSignal.set(this.schedulingPort.schedule(card.scheduling));
    this.cardShownAt = Date.now();
  }

  private requireUser(): User {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('No hay una sesión activa para repasar.');
    }
    return user;
  }
}
