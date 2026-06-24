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
  templateUrl: './card-form-dialog.component.html',
  styleUrl: './card-form-dialog.component.scss',
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
    this.saved.emit({ cardType: 'basic', front: value.front.trim(), back: value.back.trim() });
  }
}
