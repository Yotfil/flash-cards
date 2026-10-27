import { Component, ElementRef, computed, effect, input, output, viewChild } from '@angular/core';

import { IconComponent } from '@shared/icon/icon.component';

import { PRACTICA_COPY } from '../practica.copy';

type OptionState = 'idle' | 'correct' | 'wrong' | 'muted';

/** Acento para la correcta y atenuado para el resto: la escala de calificación no se usa aquí. */
const STATE_CLASSES: Readonly<Record<OptionState, string>> = {
  idle: 'border-glass-border bg-surface text-text hover:border-accent-line',
  correct: 'border-accent bg-accent-tint text-text',
  wrong: 'border-glass-border bg-surface text-text dimmed',
  muted: 'border-glass-border bg-surface text-text-dim dimmed',
};

// Una pregunta de opción múltiple: el anverso y cuatro opciones. Tras responder, todas se bloquean;
// la correcta se resalta con acento y ✓, la elegida errónea se atenúa con ✗ y el resto se atenúa.
// Cada pregunta nueva lleva el foco a su enunciado (no a la primera opción: un Intro de más tras
// "Siguiente" respondería sin querer); el enunciado no es una parada de Tab.
@Component({
  selector: 'app-multiple-choice-question',
  imports: [IconComponent],
  templateUrl: './multiple-choice-question.component.html',
  styleUrl: './multiple-choice-question.component.scss',
})
export class MultipleChoiceQuestionComponent {
  readonly questionId = input.required<string>();
  readonly prompt = input.required<string>();
  readonly options = input.required<readonly string[]>();
  readonly answered = input<{ chosen: string; answer: string } | null>(null);
  readonly choose = output<string>();

  protected readonly copy = PRACTICA_COPY;
  protected readonly choices = computed(() =>
    this.options().map((text) => {
      const state = this.stateOf(text);
      return { text, state, classes: STATE_CLASSES[state] };
    }),
  );
  private readonly promptHeading =
    viewChild.required<ElementRef<HTMLHeadingElement>>('promptHeading');

  constructor() {
    effect(() => {
      this.questionId();
      this.promptHeading().nativeElement.focus();
    });
  }

  private stateOf(option: string): OptionState {
    const answered = this.answered();
    if (!answered) {
      return 'idle';
    }
    if (option === answered.answer) {
      return 'correct';
    }
    return option === answered.chosen ? 'wrong' : 'muted';
  }
}
