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
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
    >
      <form
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        [attr.aria-label]="heading()"
        [formGroup]="form"
        [attr.aria-busy]="pending()"
        (ngSubmit)="submit()"
        (keydown.escape)="pending() || cancelled.emit()"
        class="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-6 shadow-xl"
      >
        <h2 class="text-lg font-semibold text-text-primary">{{ heading() }}</h2>

        <div class="mt-5 flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label for="book-name" class="text-sm font-medium text-text-secondary">Nombre</label>
            <input
              id="book-name"
              type="text"
              formControlName="name"
              autocomplete="off"
              placeholder="Ej. Vocabulario de inglés"
              class="rounded-lg border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-focus-ring"
            />
            @if (showNameError()) {
              <p class="text-sm text-text-muted">El nombre es obligatorio.</p>
            }
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="book-subject" class="text-sm font-medium text-text-secondary">
              Materia
            </label>
            <input
              id="book-subject"
              type="text"
              formControlName="subject"
              autocomplete="off"
              placeholder="Ej. general, language-en"
              class="rounded-lg border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-focus-ring"
            />
            <p class="text-xs text-text-muted">Sólo es una etiqueta; puedes dejar "general".</p>
          </div>

          <fieldset class="flex flex-col gap-1.5">
            <legend class="text-sm font-medium text-text-secondary">Dirección de estudio</legend>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 text-sm text-text-primary">
                <input type="radio" formControlName="studyDirection" value="forward" />
                Sólo anverso → reverso
              </label>
              <label class="flex items-center gap-2 text-sm text-text-primary">
                <input type="radio" formControlName="studyDirection" value="both" />
                Ambos sentidos
              </label>
            </div>
          </fieldset>

          <div class="flex gap-4">
            <div class="flex flex-1 flex-col gap-1.5">
              <label for="book-new" class="text-sm font-medium text-text-secondary">
                Nuevas por día
              </label>
              <input
                id="book-new"
                type="number"
                min="0"
                formControlName="newCardsPerDay"
                class="rounded-lg border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-focus-ring"
              />
            </div>
            <div class="flex flex-1 flex-col gap-1.5">
              <label for="book-max" class="text-sm font-medium text-text-secondary">
                Máx. repasos/día
              </label>
              <input
                id="book-max"
                type="number"
                min="0"
                formControlName="maxReviewsPerDay"
                class="rounded-lg border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-focus-ring"
              />
              <p class="text-xs text-text-muted">0 = sin tope.</p>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            [disabled]="pending()"
            (click)="cancelled.emit()"
            class="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            [disabled]="form.invalid || pending()"
            class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            @if (pending()) {
              Guardando…
            } @else {
              {{ submitLabel() }}
            }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class BookFormDialogComponent implements OnInit {
  /** Libro a editar; si no se pasa, el diálogo está en modo "crear". */
  readonly book = input<Book | null>(null);
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
