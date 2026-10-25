import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Logger } from '@domain/ports/logger.port';

import { ESTUDIO_COPY } from '../estudio.copy';

type LaunchState = 'idle' | 'preparing' | 'empty' | 'error';

const VARIANT_CLASSES = {
  primary: 'bg-accent text-accent-ink shadow-btn',
  secondary: 'border border-glass-border text-text',
} as const;

// Botón que prepara algo (una sesión de repaso, una práctica) y lo abre: "Preparando…" deshabilitado
// mientras tanto (un segundo toque no hace nada). Quien prepara entrega a su propia bandeja y dice
// cuántas preparó: con alguna, navega al destino; sin ninguna, muestra el aviso de vacío sin salir;
// si falla, muestra el error con "Reintentar" y nunca el vacío (un fallo no es un capítulo vacío).
@Component({
  selector: 'app-study-launch-button',
  templateUrl: './study-launch-button.component.html',
  styleUrl: './study-launch-button.component.scss',
})
export class StudyLaunchButtonComponent {
  readonly label = input.required<string>();
  readonly variant = input<keyof typeof VARIANT_CLASSES>('primary');
  /** Prepara, entrega a su bandeja y devuelve cuántas tarjetas o preguntas entregó. */
  readonly prepare = input.required<() => Promise<number>>();
  /** Adónde ir si se entregó algo (`['/repaso']`, `['/practicar']`). */
  readonly destination = input.required<string[]>();
  /** El aviso de vacío de esa entrada (en Hoy no aplica: el botón se deshabilita con 0). */
  readonly emptyMessage = input('');
  readonly errorMessage = input.required<string>();
  readonly disabled = input(false);

  private readonly router = inject(Router);
  private readonly logger = inject(Logger);

  protected readonly copy = ESTUDIO_COPY;
  protected readonly state = signal<LaunchState>('idle');
  protected readonly variantClasses = computed(() => VARIANT_CLASSES[this.variant()]);

  protected async launch(): Promise<void> {
    if (this.state() === 'preparing') {
      return;
    }
    this.state.set('preparing');
    try {
      const prepared = await this.prepare()();
      if (prepared === 0) {
        this.state.set('empty');
        return;
      }
      await this.router.navigate(this.destination());
      this.state.set('idle');
    } catch (error) {
      this.logger.error(this.errorMessage(), error);
      this.state.set('error');
    }
  }
}
