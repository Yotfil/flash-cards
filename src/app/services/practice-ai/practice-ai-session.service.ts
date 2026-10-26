import { Injectable, computed, inject, signal } from '@angular/core';

import type { CardFace } from '@domain/models/card.model';
import { ratingCountKey, type RatingCounts } from '@domain/models/daily-stats.model';
import type { Rating } from '@domain/models/rating';
import { Logger } from '@domain/ports/logger.port';
import {
  PracticePackageGoneError,
  PracticePackageRepository,
} from '@domain/ports/practice-package.repository';
import { requireSessionUid } from '@services/session/require-session';
import { SessionService } from '@services/session/session.service';

import type { PreparedPracticeAi } from './practice-ai-handoff.service';
import { PracticePackagesService } from './practice-packages.service';
import {
  closeBecausePackageIsGone,
  gradeCurrent,
  progress,
  requeueRejected,
  reveal,
  startPracticeSession,
  type PracticeAiSessionState,
} from './practice-ai-session-state';

export type PracticeAiSessionStatus = 'idle' | 'active' | 'finished' | 'gone';

/** "Otra vez" o "Difícil": lo que se refuerza con la IA. */
const HARD_GRADE = 2;

// La práctica de un paquete en curso, efímera. Cada nota se guarda sin esperar (solo la última
// nota y el día del ítem, en su paquete): nunca toca tarjetas, historial ni el día de los libros.
// Si el servidor rechaza una nota, el ítem vuelve al final con un aviso, como en el repaso; si la
// rechaza porque el paquete ya no existe, la práctica se cierra (repetirla no serviría de nada).
@Injectable({ providedIn: 'root' })
export class PracticeAiSessionService {
  private readonly packages = inject(PracticePackageRepository);
  private readonly packageList = inject(PracticePackagesService);
  private readonly session = inject(SessionService);
  private readonly logger = inject(Logger);

  private readonly state = signal<PracticeAiSessionState | null>(null);
  private readonly alertsSignal = signal<readonly { readonly front: string }[]>([]);
  /** Una nota rechazada de una práctica anterior no debe tocar la nueva. */
  private sessionNumber = 0;

  readonly alerts = this.alertsSignal.asReadonly();
  readonly status = computed<PracticeAiSessionStatus>(() => this.state()?.status ?? 'idle');
  readonly packageId = computed(() => this.state()?.packageId ?? null);
  readonly current = computed<CardFace | undefined>(() => {
    const state = this.state();
    return state?.status === 'active' ? state.queue[state.index] : undefined;
  });
  readonly revealed = computed(() => this.state()?.revealed ?? false);
  readonly position = computed(() => (this.state()?.index ?? 0) + 1);
  readonly total = computed(() => this.state()?.queue.length ?? 0);
  readonly progress = computed(() => {
    const state = this.state();
    return state ? progress(state) : 0;
  });
  readonly ratingCounts = computed<RatingCounts>(() => {
    const counts: RatingCounts = { again: 0, hard: 0, good: 0, easy: 0 };
    for (const grade of Object.values(this.state()?.grades ?? {})) {
      counts[ratingCountKey(grade)]++;
    }
    return counts;
  });
  /** Todos los ítems de la práctica, una vez cada uno. */
  readonly reviewedFaces = computed<CardFace[]>(() => {
    const seen = new Set<string>();
    return (this.state()?.queue ?? []).filter((item) => !seen.has(item.id) && seen.add(item.id));
  });
  readonly hardFaces = computed<CardFace[]>(() => {
    const grades = this.state()?.grades ?? {};
    return this.reviewedFaces().filter(
      (item) => (grades[item.id] ?? 0) <= HARD_GRADE && item.id in grades,
    );
  });
  readonly hardCount = computed(() => this.hardFaces().length);
  readonly rejectedAfterFinish = computed(() => this.state()?.rejectedAfterFinish ?? 0);

  start(prepared: PreparedPracticeAi): void {
    this.sessionNumber++;
    this.state.set(startPracticeSession(prepared));
    this.alertsSignal.set([]);
  }

  reveal(): void {
    const state = this.state();
    if (state) {
      this.state.set(reveal(state));
    }
  }

  /** Avanza al instante y guarda la nota sin esperar al servidor. */
  grade(rating: Rating): void {
    const state = this.state();
    const item = state?.queue[state.index];
    if (!state || !item) {
      return;
    }
    const next = gradeCurrent(state, rating);
    if (next === state) {
      return;
    }
    this.state.set(next);
    // El detalle del paquete y el prompt ven la nota ya, sin releer.
    this.packageList.applyGrade(state.packageId, item.id, rating, state.dayId);
    const session = this.sessionNumber;
    this.packages
      .recordGrade(requireSessionUid(this.session.user()), state.packageId, item.id, {
        grade: rating,
        dayId: state.dayId,
      })
      .catch((error: unknown) => {
        this.logger.error('No se guardó la calificación de un ítem de práctica', error);
        const current = this.state();
        if (!current || session !== this.sessionNumber) {
          return;
        }
        if (error instanceof PracticePackageGoneError) {
          this.state.set(closeBecausePackageIsGone(current));
          return;
        }
        this.state.set(requeueRejected(current, item.id));
        this.alertsSignal.update((alerts) => [...alerts, { front: item.front }]);
      });
  }

  reset(): void {
    this.sessionNumber++;
    this.state.set(null);
    this.alertsSignal.set([]);
  }
}
