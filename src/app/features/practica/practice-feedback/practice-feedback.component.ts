import { Component, input } from '@angular/core';

import { IconComponent } from '@shared/icon/icon.component';

import { PRACTICA_COPY, wrongAnswerLabel } from '../practica.copy';

// El resultado de la pregunta, anunciado al responder: "¡Correcto!" con ✓ o la respuesta correcta
// con ✗. La región existe siempre para que el lector de pantalla la anuncie al llenarse.
@Component({
  selector: 'app-practice-feedback',
  imports: [IconComponent],
  templateUrl: './practice-feedback.component.html',
  styleUrl: './practice-feedback.component.scss',
})
export class PracticeFeedbackComponent {
  readonly result = input.required<{ correct: boolean; answer: string } | null>();

  protected readonly copy = PRACTICA_COPY;
  protected readonly wrongAnswer = wrongAnswerLabel;
}
