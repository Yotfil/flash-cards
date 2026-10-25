import { Component, computed, inject, type OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DailyQueueService } from '@services/queue/daily-queue.service';
import { StudyHandoffService } from '@services/queue/study-handoff.service';
import { SessionService } from '@services/session/session.service';
import { formatLocalDate } from '@services/study-day/study-day';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';

import { PracticeAiTodayBlockComponent } from '../../practica-ia/practice-ai-today-block/practice-ai-today-block.component';
import { BookPendingRowComponent } from '../book-pending-row/book-pending-row.component';
import { HOY_COPY } from '../hoy.copy';
import {
  NewCardsAdjusterComponent,
  type NewCardsChange,
} from '../new-cards-adjuster/new-cards-adjuster.component';
import { StreakBadgeComponent } from '../streak-badge/streak-badge.component';
import { TodayHeroComponent } from '../today-hero/today-hero.component';

type HoyView = 'loading' | 'error' | 'welcome' | 'settled' | 'queue';

// Hoy: en un vistazo, qué toca estudiar. Arma la cola en cada entrada (también al volver de una
// sesión) y pinta esqueleto, error con Reintentar, bienvenida sin libros, el bloque asentado si
// está al día, o el bloque con el desglose por libro y el ajuste de nuevas.
@Component({
  selector: 'app-hoy-page',
  imports: [
    RouterLink,
    BookPendingRowComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    NewCardsAdjusterComponent,
    PracticeAiTodayBlockComponent,
    SkeletonComponent,
    StreakBadgeComponent,
    TodayHeroComponent,
  ],
  templateUrl: './hoy-page.component.html',
  styleUrl: './hoy-page.component.scss',
})
export class HoyPageComponent implements OnInit {
  protected readonly queue = inject(DailyQueueService);
  private readonly session = inject(SessionService);
  private readonly studyHandoff = inject(StudyHandoffService);

  protected readonly copy = HOY_COPY;
  protected readonly dateLabel = computed(() => {
    const user = this.session.user();
    return user ? formatLocalDate(new Date(), user.settings.timezone) : '';
  });
  protected readonly view = computed<HoyView>(() => {
    const status = this.queue.status();
    if (status !== 'ready') {
      return status;
    }
    if (!this.queue.hasBooks()) {
      return 'welcome';
    }
    // Al día = nada vencido ni nuevas disponibles. Bajar las nuevas a 0 a mano no es estar al día.
    const base = this.queue.baseQueue();
    const available = Object.values(base.availableNewByBook).reduce((sum, count) => sum + count, 0);
    return base.dueCount + available === 0 ? 'settled' : 'queue';
  });
  protected readonly count = computed(() => this.queue.sessionQueue().cards.length);
  protected readonly streakDays = computed(() =>
    this.queue.streak.hasValue() ? this.queue.streak.value() : null,
  );
  protected readonly showStreak = computed(() => {
    const view = this.view();
    return view !== 'loading' && view !== 'welcome';
  });
  protected readonly prepare = async () =>
    this.studyHandoff.handCards(await this.queue.prepareSession(), { kind: 'today' });

  ngOnInit(): void {
    this.queue.refresh();
  }

  protected adjust(change: NewCardsChange): void {
    this.queue.setSessionNew(change.bookId, change.count);
  }
}
