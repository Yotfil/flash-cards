import { Component, type OnInit, HostListener, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { Card, Rating } from '@domain/models';
import { ReviewService } from '@services/review';
import { type ClozeSegment, clozeSegments } from '@services/cloze';
import { RatingComponent } from '../rating/rating.component';

/** Sesión de repaso a pantalla completa (spec §8.6): Momento 1 (anverso + "Mostrar respuesta") →
 *  Momento 2 (reverso + 4 cerebros). Sin la navegación del shell. La lógica vive en ReviewService;
 *  este componente sólo pinta, captura toques y atajos (espacio = revelar, 1-4 = calificar). */
@Component({
  selector: 'app-review-session',
  imports: [RouterLink, RatingComponent],
  templateUrl: './review-session.component.html',
  styleUrl: './review-session.component.scss',
})
export class ReviewSessionComponent implements OnInit {
  private readonly reviewService = inject(ReviewService);
  private readonly router = inject(Router);

  protected readonly status = this.reviewService.status;
  protected readonly current = this.reviewService.current;
  protected readonly revealed = this.reviewService.revealed;
  protected readonly suggestedRating = this.reviewService.suggestedRating;
  protected readonly previews = this.reviewService.previews;
  protected readonly errorMessage = this.reviewService.errorMessage;
  protected readonly position = this.reviewService.position;
  protected readonly total = this.reviewService.total;
  protected readonly summary = this.reviewService.summary;

  ngOnInit(): void {
    // Sin sesión activa (p. ej. recarga directa de /repaso): no hay nada que mostrar.
    if (this.reviewService.status() === 'idle') {
      void this.router.navigate(['/biblioteca']);
    }
  }

  protected progressPercent(): number {
    const total = this.total();
    return total === 0 ? 0 : (this.summary().reviewed / total) * 100;
  }

  /** ¿La tarjeta es cloze? Decide cómo se pinta (segmentos con huecos vs anverso/reverso). */
  protected isCloze(card: Card): boolean {
    return card.cardType === 'cloze';
  }

  /** Segmentos de una tarjeta cloze para pintar huecos y respuestas. */
  protected segments(text: string): ClozeSegment[] {
    return clozeSegments(text);
  }

  protected reveal(): void {
    this.reviewService.reveal();
  }

  protected grade(rating: Rating): void {
    void this.reviewService.grade(rating);
  }

  /** Acepta el grado sugerido (si hay). Es el "confirmar" del auto-grading: Enter/Espacio al revelar. */
  protected acceptSuggestion(): void {
    const suggested = this.suggestedRating();
    if (suggested !== null) {
      this.grade(suggested);
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (this.status() !== 'active') {
      return;
    }
    if (event.key === ' ' && !this.revealed()) {
      event.preventDefault();
      this.reveal();
      return;
    }
    if (this.revealed() && ['1', '2', '3', '4'].includes(event.key)) {
      event.preventDefault();
      this.grade(Number(event.key) as Rating);
      return;
    }
    // Confirmar la sugerencia: Enter (o Espacio, ya revelado) acepta el grado resaltado.
    if (this.revealed() && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.acceptSuggestion();
    }
  }
}
