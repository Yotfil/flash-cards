import { Component, computed, inject, type OnInit } from '@angular/core';
import { Router } from '@angular/router';

import type { Rating } from '@domain/models/rating';
import { StudyHandoffService } from '@services/queue/study-handoff.service';
import { ReviewSessionService } from '@services/review/review-session.service';
import { SessionTopBarComponent } from '@shared/session-top-bar/session-top-bar.component';

import { OfflineIndicatorComponent } from '../../shell/offline-indicator/offline-indicator.component';
import { FlipCardComponent } from '../flip-card/flip-card.component';
import { RatingBarComponent } from '../rating-bar/rating-bar.component';
import {
  REPASO_COPY,
  rejectedGradeMessage,
  remainingLabel,
  reviewedCardsLabel,
} from '../repaso.copy';
import { SessionSummaryComponent } from '../session-summary/session-summary.component';

const RATING_KEYS: Readonly<Record<string, Rating>> = { '1': 1, '2': 2, '3': 3, '4': 4 };

// La sesión de repaso a pantalla completa. Cada entrada toma la lista entregada (una sola vez) y
// arranca de cero; sin lista, vuelve a Hoy. Teclado: Espacio revela (o confirma la sugerencia),
// Enter confirma la sugerencia, 1-4 califican con la respuesta revelada.
@Component({
  selector: 'app-repaso-page',
  imports: [
    FlipCardComponent,
    OfflineIndicatorComponent,
    RatingBarComponent,
    SessionSummaryComponent,
    SessionTopBarComponent,
  ],
  templateUrl: './repaso-page.component.html',
  styleUrl: './repaso-page.component.scss',
  host: { '(window:keydown)': 'onKeydown($event)' },
})
export class RepasoPageComponent implements OnInit {
  protected readonly session = inject(ReviewSessionService);
  private readonly handoff = inject(StudyHandoffService);
  private readonly router = inject(Router);

  protected readonly copy = REPASO_COPY;
  protected readonly reviewedLabel = reviewedCardsLabel;
  protected readonly remainingText = computed(() => remainingLabel(this.session.remaining()));
  protected readonly alertMessages = computed(() =>
    this.session.alerts().map((alert) => rejectedGradeMessage(alert.front)),
  );

  ngOnInit(): void {
    const prepared = this.handoff.take();
    if (!prepared || prepared.cards.length === 0) {
      void this.router.navigate(['/hoy']);
      return;
    }
    this.session.start(prepared);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.repeat || this.session.status() !== 'active') {
      return;
    }
    const rating = RATING_KEYS[event.key];
    if (rating) {
      if (this.session.revealed()) {
        this.session.grade(rating);
      }
      return;
    }
    // Con el foco en un botón, Espacio y Enter son de ese botón (su clic nativo).
    if (event.target instanceof HTMLButtonElement) {
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      if (!this.session.revealed()) {
        this.session.reveal();
      } else {
        this.confirmSuggestion();
      }
    } else if (event.key === 'Enter' && this.session.revealed()) {
      this.confirmSuggestion();
    }
  }

  protected exit(): void {
    this.session.exit();
    void this.router.navigate(['/hoy']);
  }

  protected home(): void {
    this.session.reset();
    void this.router.navigate(['/hoy']);
  }

  private confirmSuggestion(): void {
    const suggested = this.session.suggested();
    if (suggested) {
      this.session.grade(suggested);
    }
  }
}
