import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { BookPending } from '@services/queue/build-daily-queue';
import { IconComponent } from '@shared/icon/icon.component';

import { bookPendingMeta } from '../hoy.copy';

// Una fila del desglose "Por libro": toda ella lleva al detalle del libro.
@Component({
  selector: 'app-book-pending-row',
  imports: [RouterLink, IconComponent],
  templateUrl: './book-pending-row.component.html',
  styleUrl: './book-pending-row.component.scss',
})
export class BookPendingRowComponent {
  readonly pending = input.required<BookPending>();

  protected readonly meta = computed(() => bookPendingMeta(this.pending().due, this.pending().new));
  protected readonly total = computed(() => this.pending().due + this.pending().new);
}
