import { Component, type OnInit, computed, inject, input, output } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type NonNullableFormBuilder,
} from '@angular/forms';

import type { Card, CardContentDraft } from '@domain/models';

/** Formulario de tarjeta en diálogo (crear/editar). El MVP sólo expone anverso/reverso (Principio
 *  2). Emite un `CardContentDraft` válido en `saved`; el padre decide si crea o edita. Accesible:
 *  role="dialog", aria-modal, labels asociadas, cierre con Escape. */
@Component({
  selector: 'app-card-form-dialog',
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
            <label for="card-front" class="text-sm font-medium text-text-secondary">Anverso</label>
            <textarea
              id="card-front"
              formControlName="front"
              rows="2"
              placeholder="Ej. to give up"
              class="resize-y rounded-lg border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-focus-ring"
            ></textarea>
            @if (showError('front')) {
              <p class="text-sm text-text-muted">El anverso es obligatorio.</p>
            }
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="card-back" class="text-sm font-medium text-text-secondary">Reverso</label>
            <textarea
              id="card-back"
              formControlName="back"
              rows="2"
              placeholder="Ej. rendirse"
              class="resize-y rounded-lg border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-focus-ring"
            ></textarea>
            @if (showError('back')) {
              <p class="text-sm text-text-muted">El reverso es obligatorio.</p>
            }
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
export class CardFormDialogComponent implements OnInit {
  /** Tarjeta a editar; si no se pasa, el diálogo está en modo "crear". */
  readonly card = input<Card | null>(null);
  /** El padre lo pone en true mientras persiste; bloquea botones y reenvíos. */
  readonly pending = input(false);
  readonly saved = output<CardContentDraft>();
  readonly cancelled = output<void>();

  private readonly formBuilder: NonNullableFormBuilder = inject(FormBuilder).nonNullable;

  protected readonly heading = computed(() => (this.card() ? 'Editar tarjeta' : 'Nueva tarjeta'));
  protected readonly submitLabel = computed(() => (this.card() ? 'Guardar' : 'Crear tarjeta'));

  protected readonly form: FormGroup = this.formBuilder.group({
    front: ['', [Validators.required, Validators.maxLength(2000)]],
    back: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    const existing = this.card();
    if (existing) {
      this.form.setValue({ front: existing.front, back: existing.back });
    }
  }

  protected showError(controlName: 'front' | 'back'): boolean {
    const control = this.form.get(controlName);
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
    this.saved.emit({ front: value.front.trim(), back: value.back.trim() });
  }
}
