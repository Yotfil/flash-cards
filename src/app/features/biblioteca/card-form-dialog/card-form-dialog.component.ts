import { Component, type OnInit, computed, inject, input, output, signal } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type NonNullableFormBuilder,
  type ValidationErrors,
} from '@angular/forms';

import type { Card, CardContentDraft, CardType } from '@domain/models';
import { hasCloze } from '@services/cloze';
import { ModalComponent } from '@shared/modal/modal.component';

/** Valida que un texto cloze tenga al menos un hueco `{{...}}`. */
function clozeValidator(control: AbstractControl): ValidationErrors | null {
  return hasCloze((control.value ?? '') as string) ? null : { cloze: true };
}

/** Formulario de tarjeta en diálogo (crear/editar). Soporta dos tipos: básica (anverso/reverso) y
 *  cloze (un texto con huecos `{{...}}`). El tipo se elige al crear; al editar queda fijo. Emite un
 *  `CardContentDraft` válido en `saved`; el padre decide si crea o edita. Accesible: role="dialog",
 *  aria-modal, labels asociadas, cierre con Escape. */
@Component({
  selector: 'app-card-form-dialog',
  imports: [ModalComponent, ReactiveFormsModule],
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

  /** Tipo actual del formulario. Mode-switch (no es un control): decide qué campos y validadores van. */
  protected readonly cardType = signal<CardType>('basic');

  // Ejemplos de la sintaxis cloze como texto plano (evita escapar `{{ }}` en la plantilla).
  protected readonly clozeMarker = '{{…}}';
  protected readonly clozePlaceholder = 'Ej. El {{gato}} es {{negro}}';
  protected readonly isEditing = computed(() => this.card() !== null);
  protected readonly heading = computed(() =>
    this.isEditing() ? 'Editar tarjeta' : 'Nueva tarjeta',
  );
  protected readonly submitLabel = computed(() => (this.isEditing() ? 'Guardar' : 'Crear tarjeta'));

  protected readonly form: FormGroup = this.formBuilder.group({
    front: ['', [Validators.required, Validators.maxLength(2000)]],
    back: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    const existing = this.card();
    if (existing) {
      this.setCardType(existing.cardType ?? 'basic');
      this.form.setValue({ front: existing.front, back: existing.back });
    } else {
      this.setCardType('basic');
    }
  }

  /** Cambia el tipo y ajusta los validadores: cloze valida el patrón `{{...}}` en `front` y libera
   *  `back`; básica exige ambos. Sólo se invoca al crear (al editar el tipo queda fijo). */
  protected setCardType(type: CardType): void {
    this.cardType.set(type);
    const front = this.form.get('front');
    const back = this.form.get('back');
    if (front === null || back === null) {
      return;
    }
    if (type === 'cloze') {
      front.setValidators([Validators.required, Validators.maxLength(2000), clozeValidator]);
      back.clearValidators();
    } else {
      front.setValidators([Validators.required, Validators.maxLength(2000)]);
      back.setValidators([Validators.required, Validators.maxLength(2000)]);
    }
    front.updateValueAndValidity();
    back.updateValueAndValidity();
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
    const type = this.cardType();
    this.saved.emit({
      cardType: type,
      front: value.front.trim(),
      // En cloze el reverso no se usa: la respuesta vive dentro de la plantilla.
      back: type === 'cloze' ? '' : value.back.trim(),
    });
  }
}
