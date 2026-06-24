import { Component, type OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { QuizService } from '@services/quiz';
import { IconComponent } from '@shared/icon/icon.component';

/** Estado visual de una opción tras responder (sin usar la escala rojo→verde, reservada a la
 *  calificación): la correcta se marca con acento, la elegida errónea con un tono apagado. */
type OptionState = 'idle' | 'correct' | 'wrong';

/** Modo Practicar a pantalla completa (mini-quiz, Fase 2): opción múltiple y escribir, con feedback
 *  inmediato y puntaje. Es práctica aparte (no toca FSRS). Sólo pinta y captura eventos; la lógica
 *  vive en QuizService. */
@Component({
  selector: 'app-practice-session',
  imports: [RouterLink, IconComponent],
  templateUrl: './practice-session.component.html',
  styleUrl: './practice-session.component.scss',
})
export class PracticeSessionComponent implements OnInit {
  private readonly quizService = inject(QuizService);
  private readonly router = inject(Router);

  protected readonly status = this.quizService.status;
  protected readonly current = this.quizService.current;
  protected readonly answered = this.quizService.answered;
  protected readonly lastCorrect = this.quizService.lastCorrect;
  protected readonly lastAnswer = this.quizService.lastAnswer;
  protected readonly position = this.quizService.position;
  protected readonly total = this.quizService.total;
  protected readonly summary = this.quizService.summary;

  protected readonly writtenInput = signal('');
  protected readonly isLastQuestion = computed(() => this.position() === this.total());

  ngOnInit(): void {
    // Sin sesión activa (p. ej. recarga directa de /practicar): no hay nada que mostrar.
    if (this.quizService.status() === 'idle') {
      void this.router.navigate(['/biblioteca']);
    }
  }

  protected progressPercent(): number {
    const total = this.total();
    return total === 0 ? 0 : ((this.position() - 1) / total) * 100;
  }

  protected answerMultiple(option: string): void {
    this.quizService.answerMultiple(option);
  }

  protected onWrittenInput(event: Event): void {
    this.writtenInput.set((event.target as HTMLInputElement).value);
  }

  protected submitWritten(): void {
    if (this.answered() || this.writtenInput().trim() === '') {
      return;
    }
    this.quizService.answerWritten(this.writtenInput());
  }

  protected next(): void {
    this.quizService.next();
    this.writtenInput.set('');
  }

  /** Cómo se pinta una opción de opción múltiple tras responder: la correcta se resalta; sólo la
   *  elegida (si fue errónea) se marca como error; las demás quedan tenues. */
  protected optionState(option: string): OptionState {
    if (!this.answered()) {
      return 'idle';
    }
    if (option === this.current()?.answer) {
      return 'correct';
    }
    if (option === this.lastAnswer()) {
      return 'wrong';
    }
    return 'idle';
  }

  // Clases de cada opción por estado (tokens semánticos; NO la escala rojo→verde). Se arman como
  // string para que el binding no lidie con la barra de `bg-accent/10`.
  private readonly optionBase =
    'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-text-primary transition-colors disabled:cursor-default';

  protected optionClasses(option: string): string {
    if (!this.answered()) {
      return `${this.optionBase} border-border bg-surface-raised hover:bg-surface-sunken`;
    }
    switch (this.optionState(option)) {
      case 'correct':
        return `${this.optionBase} border-accent bg-accent/10`;
      case 'wrong':
        return `${this.optionBase} border-text-muted opacity-60`;
      default:
        return `${this.optionBase} border-border bg-surface-raised opacity-60`;
    }
  }
}
