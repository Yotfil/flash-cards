import { Component, type OnInit, computed, inject, input, output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type NonNullableFormBuilder,
} from '@angular/forms';

import type { Book, BookDraft } from '@domain/models';
import { DEFAULT_MAX_REVIEWS_PER_DAY, DEFAULT_NEW_CARDS_PER_DAY } from '@services/books.service';

/** Formulario de libro en diálogo (crear/editar). Sólo expone front/back del modelo que toca el
 *  usuario (Principio 2: el resto del esquema existe pero la UI del MVP no lo muestra). Emite un
 *  `BookDraft` válido en `save`; el padre decide si crea o actualiza. Accesible: role="dialog",
 *  aria-modal, labels asociadas, cierre con Escape. */
@Component({
  selector: 'app-book-form-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './book-form-dialog.component.html',
  styleUrl: './book-form-dialog.component.scss',
})
export class BookFormDialogComponent implements OnInit {
  /** Libro a editar; si no se pasa, el diálogo está en modo "crear". */
  readonly book = input<Book | null>(null);
  /** Default de tarjetas nuevas/día con el que se precarga un libro nuevo (ajuste global del
   *  usuario). En modo editar no aplica: gana el valor guardado del libro. */
  readonly defaultNewCardsPerDay = input(DEFAULT_NEW_CARDS_PER_DAY);
  /** El padre lo pone en true mientras persiste; bloquea botones y reenvíos. */
  readonly pending = input(false);
  readonly saved = output<BookDraft>();
  readonly cancelled = output<void>();

  private readonly formBuilder: NonNullableFormBuilder = inject(FormBuilder).nonNullable;

  protected readonly heading = computed(() => (this.book() ? 'Editar libro' : 'Nuevo libro'));
  protected readonly submitLabel = computed(() => (this.book() ? 'Guardar' : 'Crear libro'));

  protected readonly form: FormGroup = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    subject: ['general', [Validators.required]],
    studyDirection: ['forward' as BookDraft['studyDirection']],
    newCardsPerDay: [DEFAULT_NEW_CARDS_PER_DAY, [Validators.required, Validators.min(0)]],
    maxReviewsPerDay: [DEFAULT_MAX_REVIEWS_PER_DAY, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    const existing = this.book();
    if (existing) {
      this.form.setValue({
        name: existing.name,
        subject: existing.subject,
        studyDirection: existing.studyDirection,
        newCardsPerDay: existing.newCardsPerDay,
        maxReviewsPerDay: existing.maxReviewsPerDay,
      });
    } else {
      // Modo crear: precarga las nuevas/día con el default global del usuario (Ajustes).
      this.form.get('newCardsPerDay')?.setValue(this.defaultNewCardsPerDay());
    }
  }

  protected showNameError(): boolean {
    const control = this.form.get('name');
    return control !== null && control.invalid && control.touched;
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
      name: value.name.trim(),
      subject: value.subject.trim() || 'general',
      studyDirection: value.studyDirection,
      newCardsPerDay: Number(value.newCardsPerDay),
      maxReviewsPerDay: Number(value.maxReviewsPerDay),
    });
  }
}
