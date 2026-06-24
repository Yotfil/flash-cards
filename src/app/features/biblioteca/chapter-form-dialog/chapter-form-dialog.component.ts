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
  templateUrl: './chapter-form-dialog.component.html',
  styleUrl: './chapter-form-dialog.component.scss',
})
export class ChapterFormDialogComponent implements OnInit {
  /** Capítulo a renombrar; si no se pasa, el diálogo está en modo "crear". */
  readonly chapter = input<Chapter | null>(null);
  /** El padre lo pone en true mientras persiste; bloquea botones y reenvíos. */
  readonly pending = input(false);
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
    if (this.pending()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit({ name: this.form.getRawValue().name.trim() });
  }
}
