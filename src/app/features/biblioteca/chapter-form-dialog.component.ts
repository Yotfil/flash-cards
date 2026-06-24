import { Component, type OnInit, computed, inject, input, output } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type NonNullableFormBuilder,
} from '@angular/forms';

import type { Chapter, ChapterDraft } from '@domain/models';

/** Formulario de capítulo en diálogo (crear/renombrar). Un capítulo sólo tiene `name` editable.
 *  Emite un `ChapterDraft` válido en `saved`; el padre decide si crea o renombra. Accesible:
 *  role="dialog", aria-modal, label asociada, cierre con Escape. */
@Component({
  selector: 'app-chapter-form-dialog',
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
        (ngSubmit)="submit()"
        (keydown.escape)="cancelled.emit()"
        class="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-6 shadow-xl"
      >
        <h2 class="text-lg font-semibold text-text-primary">{{ heading() }}</h2>

        <div class="mt-5 flex flex-col gap-1.5">
          <label for="chapter-name" class="text-sm font-medium text-text-secondary">Nombre</label>
          <input
            id="chapter-name"
            type="text"
            formControlName="name"
            autocomplete="off"
            placeholder="Ej. Phrasal Verbs - Básicos"
            class="rounded-lg border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-focus-ring"
          />
          @if (showNameError()) {
            <p class="text-sm text-text-muted">El nombre es obligatorio.</p>
          }
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            (click)="cancelled.emit()"
            class="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken"
          >
            Cancelar
          </button>
          <button
            type="submit"
            [disabled]="form.invalid"
            class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {{ submitLabel() }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ChapterFormDialogComponent implements OnInit {
  /** Capítulo a renombrar; si no se pasa, el diálogo está en modo "crear". */
  readonly chapter = input<Chapter | null>(null);
  readonly saved = output<ChapterDraft>();
  readonly cancelled = output<void>();

  private readonly formBuilder: NonNullableFormBuilder = inject(FormBuilder).nonNullable;

  protected readonly heading = computed(() =>
    this.chapter() ? 'Renombrar capítulo' : 'Nuevo capítulo',
  );
  protected readonly submitLabel = computed(() => (this.chapter() ? 'Guardar' : 'Crear capítulo'));

  protected readonly form: FormGroup = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
  });

  ngOnInit(): void {
    const existing = this.chapter();
    if (existing) {
      this.form.setValue({ name: existing.name });
    }
  }

  protected showNameError(): boolean {
    const control = this.form.get('name');
    return control !== null && control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit({ name: this.form.getRawValue().name.trim() });
  }
}
