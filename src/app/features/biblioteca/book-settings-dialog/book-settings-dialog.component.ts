import { Component, type OnInit, computed, inject, input, output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type NonNullableFormBuilder,
} from '@angular/forms';

import type { Book, BookDraft } from '@domain/models';

/** Ajustes propios de un libro, en diálogo. Hoy expone la sección "Tarjetas" (nuevas/día y máx.
 *  repasos/día); está estructurado por secciones para sumar más ajustes en próximas iteraciones sin
 *  reescribirlo. Emite sólo los campos que cambian (`Partial<BookDraft>`) en `saved`; el padre
 *  persiste. Accesible: role="dialog", aria-modal, labels asociadas, cierre con Escape. */
@Component({
  selector: 'app-book-settings-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './book-settings-dialog.component.html',
  styleUrl: './book-settings-dialog.component.scss',
})
export class BookSettingsDialogComponent implements OnInit {
  /** Libro cuyos ajustes se editan. Requerido: el diálogo siempre es sobre un libro concreto. */
  readonly book = input.required<Book>();
  /** El padre lo pone en true mientras persiste; bloquea botones y reenvíos. */
  readonly pending = input(false);
  readonly saved = output<Partial<BookDraft>>();
  readonly cancelled = output<void>();

  private readonly formBuilder: NonNullableFormBuilder = inject(FormBuilder).nonNullable;

  protected readonly heading = computed(() => `Ajustes de «${this.book().name}»`);

  protected readonly form: FormGroup = this.formBuilder.group({
    newCardsPerDay: [0, [Validators.required, Validators.min(0)]],
    maxReviewsPerDay: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    const book = this.book();
    this.form.setValue({
      newCardsPerDay: book.newCardsPerDay,
      maxReviewsPerDay: book.maxReviewsPerDay,
    });
  }

  protected submit(): void {
    if (this.pending()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saved.emit({
      newCardsPerDay: Number(value.newCardsPerDay),
      maxReviewsPerDay: Number(value.maxReviewsPerDay),
    });
  }
}
