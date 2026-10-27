import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';

import { IconComponent } from '@shared/icon/icon.component';

import { PRACTICA_COPY, backLabel, scoreLabel } from '../practica.copy';

// El cierre de la práctica: cuántas acertó y el botón para volver a donde empezó. Al aparecer, el
// foco va a su título para que el lector de pantalla lo anuncie y Tab siga por el cierre.
@Component({
  selector: 'app-practice-summary',
  imports: [IconComponent],
  templateUrl: './practice-summary.component.html',
  styleUrl: './practice-summary.component.scss',
})
export class PracticeSummaryComponent {
  readonly score = input.required<number>();
  readonly total = input.required<number>();
  readonly originKind = input.required<'chapter' | 'book'>();
  readonly back = output<void>();

  protected readonly copy = PRACTICA_COPY;
  protected readonly scoreText = computed(() => scoreLabel(this.score(), this.total()));
  protected readonly backText = computed(() => backLabel(this.originKind()));
  private readonly title = viewChild.required<ElementRef<HTMLHeadingElement>>('title');

  constructor() {
    afterNextRender(() => this.title().nativeElement.focus());
  }
}
