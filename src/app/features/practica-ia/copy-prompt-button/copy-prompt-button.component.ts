import { Component, DestroyRef, inject, input, signal } from '@angular/core';

import { FileDeliveryPort } from '@domain/ports/file-delivery.port';
import { Logger } from '@domain/ports/logger.port';

import { PRACTICA_IA_COPY } from '../practica-ia.copy';

/** Cuánto se ve la confirmación de la copia. */
const COPIED_VISIBLE_MS = 3000;
let nextHintId = 0;

// Copia el prompt al portapapeles y lo confirma unos segundos en una región anunciada. Si el
// portapapeles no está o falla, muestra el prompt en un área de solo lectura para copiarlo a mano.
// Funciona sin conexión: no habla con el almacén.
@Component({
  selector: 'app-copy-prompt-button',
  templateUrl: './copy-prompt-button.component.html',
  styleUrl: './copy-prompt-button.component.scss',
})
export class CopyPromptButtonComponent {
  /** `null` = todavía no hay prompt (deshabilitado con `disabledHint`). */
  readonly prompt = input.required<string | null>();
  readonly label = input.required<string>();
  readonly disabledHint = input('');
  readonly variant = input<'primary' | 'secondary'>('secondary');

  private readonly delivery = inject(FileDeliveryPort);
  private readonly logger = inject(Logger);

  protected readonly copy = PRACTICA_IA_COPY;
  protected readonly hintId = `copy-prompt-hint-${nextHintId++}`;
  protected readonly copied = signal(false);
  protected readonly fallback = signal<string | null>(null);
  private copiedTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copiedTimer));
  }

  protected async copyPrompt(): Promise<void> {
    const prompt = this.prompt();
    if (prompt === null) {
      return;
    }
    try {
      await this.delivery.copyText(prompt);
      this.fallback.set(null);
      this.copied.set(true);
      clearTimeout(this.copiedTimer);
      this.copiedTimer = setTimeout(() => this.copied.set(false), COPIED_VISIBLE_MS);
    } catch (error) {
      this.logger.warn('No se pudo copiar el prompt al portapapeles', error);
      this.copied.set(false);
      this.fallback.set(prompt);
    }
  }
}
