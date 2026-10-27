import { Injectable, computed, inject, signal } from '@angular/core';

import { AccessRevokedError } from '@domain/models/access-revoked-error';
import type { Card } from '@domain/models/card.model';
import type { Rating } from '@domain/models/rating';
import { CardGoneError, GradePersistencePort } from '@domain/ports/grade-persistence.port';
import { Logger } from '@domain/ports/logger.port';
import { SchedulingPort } from '@domain/ports/scheduling.port';
import { CardCollectionChanges } from '@services/progress/card-collection-changes';
import type { PreparedStudy } from '@services/queue/study-handoff.service';
import { requireSessionUid, requireSessionUser } from '@services/session/require-session';
import { SessionService } from '@services/session/session.service';

import {
  closeForLostAccess,
  confirmSaved,
  dropGoneCard,
  grade,
  progressPercent,
  rejectSaved,
  remaining,
  reveal,
  startSession,
  type PreviewFn,
  type SessionState,
} from './review-session-state';

export type ReviewSessionStatus = 'idle' | 'active' | 'finished' | 'accessLost';

/** Cómo terminó la última sesión y sus tarjetas difíciles (lo consumirá la práctica con IA). */
export interface ReviewSessionEnd {
  readonly reason: 'finished' | 'exit';
  readonly difficult: Card[];
}

// La sesión de repaso en curso: el núcleo puro más el reloj, el perfil y el guardado. Calificar
// avanza al instante: el lote se envía SIN esperarlo, y su confirmación o su rechazo llegan
// después y se aplican a la aparición que los produjo. Un rechazo pasajero devuelve la tarjeta;
// los permanentes no: la tarjeta borrada sale y, sin acceso, la sesión se cierra. Cada entrada a
// la pantalla arranca una sesión nueva; nada se retoma.
@Injectable({ providedIn: 'root' })
export class ReviewSessionService {
  private readonly scheduling = inject(SchedulingPort);
  private readonly persistence = inject(GradePersistencePort);
  private readonly session = inject(SessionService);
  private readonly logger = inject(Logger);
  private readonly collectionChanges = inject(CardCollectionChanges);

  private readonly state = signal<SessionState | null>(null);
  /** Identidad de la sesión en pantalla: un guardado tardío de otra sesión no la toca. */
  private sessionNumber = 0;
  private readonly preview: PreviewFn = (scheduling, now) =>
    this.scheduling.preview(scheduling, now);

  readonly status = computed<ReviewSessionStatus>(() => this.state()?.status ?? 'idle');
  /** La aparición actual (su id distingue las vueltas de una misma tarjeta). */
  readonly current = computed(() => this.state()?.queue[0] ?? null);
  readonly revealed = computed(() => this.state()?.revealed ?? false);
  readonly suggested = computed(() => this.state()?.suggested ?? null);
  readonly previews = computed(() => this.state()?.previews ?? null);
  /** Cuándo se mostró la aparición actual: las previsualizaciones se calcularon con ese instante. */
  readonly shownAt = computed(() => new Date(this.state()?.shownAt ?? 0));
  readonly remaining = computed(() => {
    const state = this.state();
    return state ? remaining(state) : 0;
  });
  readonly progress = computed(() => {
    const state = this.state();
    return state ? progressPercent(state) : 0;
  });
  readonly ratingCounts = computed(
    () => this.state()?.ratingCounts ?? { again: 0, hard: 0, good: 0, easy: 0 },
  );
  readonly distinctCount = computed(() => this.state()?.distinctCount ?? 0);
  readonly difficultCards = computed(
    () => this.state()?.difficult.map((entry) => entry.card) ?? [],
  );
  readonly alerts = computed(() => this.state()?.alerts ?? []);
  readonly rejectedAfterFinish = computed(() => this.state()?.rejectedAfterFinish ?? 0);
  private readonly endSignal = signal<ReviewSessionEnd | null>(null);
  /** El final de la última sesión (al terminar o al salir). */
  readonly ended = this.endSignal.asReadonly();

  /** Arranca una sesión nueva con la lista entregada, en su orden. */
  start(prepared: PreparedStudy): void {
    const { timezone, dayStartHour } = requireSessionUser(this.session.user()).settings;
    this.sessionNumber++;
    this.endSignal.set(null);
    this.state.set(
      startSession({
        cards: prepared.cards,
        now: new Date(),
        preview: this.preview,
        timezone,
        dayStartHour,
      }),
    );
  }

  reveal(): void {
    const state = this.state();
    if (!state) {
      return;
    }
    const { autoGradeByTime } = requireSessionUser(this.session.user()).settings;
    this.state.set(reveal(state, new Date(), autoGradeByTime));
  }

  grade(rating: Rating): void {
    const state = this.state();
    const appearance = state?.queue[0];
    if (!state || !appearance) {
      return;
    }
    const { state: next, record } = grade(state, rating, new Date(), this.preview);
    if (!record) {
      return;
    }
    this.state.set(next);
    if (next.status === 'finished') {
      this.endSignal.set({ reason: 'finished', difficult: this.difficultCards() });
    }
    const uid = requireSessionUid(this.session.user());
    const session = this.sessionNumber;
    // La nota ya cambió la tarjeta en el dispositivo: Progreso debe volver a contar la colección. Se
    // avisa otra vez cuando responde el servidor, para que un conteo hecho antes no quede por bueno.
    this.collectionChanges.notify();
    // Sin `await`: la sesión ya avanzó; el lote quedó guardado en el dispositivo.
    this.collectionChanges.afterWrite(this.persistence.persistGrade(uid, record)).then(
      () => this.applyToSession(session, (current) => confirmSaved(current, appearance.id)),
      (error: unknown) => this.applyRejection(session, appearance.id, error),
    );
  }

  /** "Continuar" tras perder el acceso: vacía la sesión y deja la de la app en "sin acceso". */
  acknowledgeLostAccess(): void {
    this.clear();
    this.session.markAccessRevoked();
  }

  /** "Salir": vacía la sesión sin cierre. Lo ya calificado sigue su guardado. */
  exit(): void {
    if (this.state()?.status === 'active') {
      this.endSignal.set({ reason: 'exit', difficult: this.difficultCards() });
    }
    this.clear();
  }

  /** "Volver a Hoy" desde el cierre: vacía la sesión terminada. */
  reset(): void {
    this.clear();
  }

  private clear(): void {
    this.sessionNumber++;
    this.state.set(null);
  }

  /** Cada rechazo según su causa: reintentar solo sirve si el servidor puede llegar a aceptarlo. */
  private applyRejection(session: number, appearanceId: string, error: unknown): void {
    if (error instanceof AccessRevokedError) {
      this.logger.error('Sin acceso: el servidor negó el permiso a una calificación', error);
      this.applyToSession(session, closeForLostAccess);
      return;
    }
    if (error instanceof CardGoneError) {
      this.logger.error('No se guardó una calificación: la tarjeta ya no existe', error);
      this.applyToSession(session, (current) =>
        dropGoneCard(current, appearanceId, new Date(), this.preview),
      );
      return;
    }
    this.logger.error('No se guardó una calificación', error);
    this.applyToSession(session, (current) =>
      rejectSaved(current, appearanceId, new Date(), this.preview),
    );
  }

  /**
   * Aplica un resultado del guardado solo si la sesión que lo produjo sigue en pantalla. Si con él
   * termina (se borró la última tarjeta que quedaba), avisa del final como al calificar.
   */
  private applyToSession(session: number, change: (state: SessionState) => SessionState) {
    const current = this.state();
    if (!current || session !== this.sessionNumber) {
      return;
    }
    const next = change(current);
    this.state.set(next);
    if (current.status === 'active' && next.status === 'finished') {
      this.endSignal.set({ reason: 'finished', difficult: this.difficultCards() });
    }
  }
}
