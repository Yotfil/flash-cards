import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';

import { PRACTICA_COPY } from '../practica.copy';

// Una pregunta de escribir: el anverso, un campo sin autocompletar, autocapitalizar ni autocorregir y
// "Comprobar" (o Enter), deshabilitado mientras no haya texto. Respondida, todo se bloquea; una
// pregunta nueva vacía el campo y le da el foco.
@Component({
  selector: 'app-written-question',
  templateUrl: './written-question.component.html',
  styleUrl: './written-question.component.scss',
})
export class WrittenQuestionComponent {
  readonly questionId = input.required<string>();
  readonly prompt = input.required<string>();
  readonly answered = input(false);
  readonly submitted = output<string>();

  protected readonly copy = PRACTICA_COPY;
  protected readonly text = linkedSignal({ source: this.questionId, computation: () => '' });
  protected readonly canCheck = computed(() => !this.answered() && this.text().trim() !== '');
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  constructor() {
    effect(() => {
      this.questionId();
      this.field().nativeElement.focus();
    });
  }

  protected typeText(event: Event): void {
    this.text.set((event.target as HTMLInputElement).value);
  }

  protected send(event: Event): void {
    event.preventDefault();
    if (this.canCheck()) {
      this.submitted.emit(this.text());
    }
  }
}
