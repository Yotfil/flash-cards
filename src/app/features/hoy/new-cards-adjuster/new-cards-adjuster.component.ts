import { Component, input, output } from '@angular/core';

import type { NewCardsChoice } from '@services/queue/daily-queue.service';
import { IconComponent } from '@shared/icon/icon.component';

import { HOY_COPY, newAvailableLabel } from '../hoy.copy';

/** Lo que pide el control: el nuevo número de nuevas de un libro para la sesión de hoy. */
export interface NewCardsChange {
  readonly bookId: string;
  readonly count: number;
}

// Pliegue "Ajustar nuevas de hoy": un control por libro, de uno en uno entre 0 y sus nuevas
// disponibles. Solo emite; la cola se recalcula en el servicio sin volver a consultar.
@Component({
  selector: 'app-new-cards-adjuster',
  imports: [IconComponent],
  templateUrl: './new-cards-adjuster.component.html',
  styleUrl: './new-cards-adjuster.component.scss',
})
export class NewCardsAdjusterComponent {
  readonly books = input.required<readonly NewCardsChoice[]>();
  readonly changed = output<NewCardsChange>();

  protected readonly copy = HOY_COPY;
  protected readonly availableLabel = newAvailableLabel;

  protected step(book: NewCardsChoice, delta: number): void {
    this.changed.emit({ bookId: book.bookId, count: book.chosen + delta });
  }
}
