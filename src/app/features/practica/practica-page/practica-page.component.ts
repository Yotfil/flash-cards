import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  viewChild,
  type OnInit,
} from '@angular/core';
import { Router } from '@angular/router';

import {
  PracticeHandoffService,
  type PracticeOrigin,
} from '@services/practice/practice-handoff.service';
import { PracticeSessionService } from '@services/practice/practice-session.service';
import { SessionTopBarComponent } from '@shared/session-top-bar/session-top-bar.component';

import { MultipleChoiceQuestionComponent } from '../multiple-choice-question/multiple-choice-question.component';
import { PRACTICA_COPY, positionLabel } from '../practica.copy';
import { PracticeFeedbackComponent } from '../practice-feedback/practice-feedback.component';
import { PracticeSummaryComponent } from '../practice-summary/practice-summary.component';
import { WrittenQuestionComponent } from '../written-question/written-question.component';

// La práctica a pantalla completa. Cada entrada toma el quiz entregado (una sola vez) y empieza de
// cero; sin quiz, vuelve a la Biblioteca. Salir y volver llevan al origen (capítulo o libro) y al
// cerrarse la pantalla la práctica se vacía: nunca se retoma.
@Component({
  selector: 'app-practica-page',
  imports: [
    MultipleChoiceQuestionComponent,
    PracticeFeedbackComponent,
    PracticeSummaryComponent,
    SessionTopBarComponent,
    WrittenQuestionComponent,
  ],
  templateUrl: './practica-page.component.html',
  styleUrl: './practica-page.component.scss',
})
export class PracticaPageComponent implements OnInit {
  protected readonly session = inject(PracticeSessionService);
  private readonly handoff = inject(PracticeHandoffService);
  private readonly router = inject(Router);

  protected readonly copy = PRACTICA_COPY;
  protected readonly positionText = computed(() =>
    positionLabel(this.session.position(), this.session.total()),
  );
  protected readonly answered = computed(() => {
    const feedback = this.session.feedback();
    return feedback ? { chosen: feedback.chosen, answer: feedback.answer } : null;
  });
  protected readonly advanceText = computed(() =>
    this.session.isLast() ? this.copy.seeResult : this.copy.next,
  );
  protected readonly originKind = computed(() => this.session.origin()?.kind ?? 'chapter');
  private readonly advanceButton = viewChild<ElementRef<HTMLButtonElement>>('advanceButton');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.session.reset());
    // Respondida la pregunta, el foco pasa a "Siguiente": con teclado, Enter responde y Enter avanza.
    effect(() => this.advanceButton()?.nativeElement.focus());
  }

  ngOnInit(): void {
    const prepared = this.handoff.take();
    if (!prepared || prepared.questions.length === 0) {
      void this.router.navigate(['/biblioteca']);
      return;
    }
    this.session.start(prepared);
  }

  protected leave(): void {
    const origin = this.session.origin();
    void this.router.navigate(origin ? originPath(origin) : ['/biblioteca']);
  }
}

function originPath(origin: PracticeOrigin): string[] {
  return origin.kind === 'chapter'
    ? ['/biblioteca', origin.bookId, origin.chapterId]
    : ['/biblioteca', origin.bookId];
}
