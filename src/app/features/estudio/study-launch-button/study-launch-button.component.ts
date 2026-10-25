import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

import type { Card } from '@domain/models/card.model';
import { Logger } from '@domain/ports/logger.port';
import { StudyHandoffService, type StudySource } from '@services/queue/study-handoff.service';

import { ESTUDIO_COPY } from '../estudio.copy';

type LaunchState = 'idle' | 'preparing' | 'empty' | 'error';

const VARIANT_CLASSES = {
  primary: 'bg-accent text-accent-ink shadow-btn',
  secondary: 'border border-glass-border text-text',
} as const;

// Botón que prepara una sesión (Hoy, un libro o un capítulo) y la abre: "Preparando…" deshabilitado
// mientras tanto (un segundo toque no hace nada); con tarjetas, las entrega a la sesión y navega
// al repaso; sin ninguna, dice que está al día sin salir; si falla, muestra el error con
// "Reintentar" y nunca el "al día" (un fallo no es un capítulo vacío).
@Component({
  selector: 'app-study-launch-button',
  templateUrl: './study-launch-button.component.html',
  styleUrl: './study-launch-button.component.scss',
})
export class StudyLaunchButtonComponent {
  readonly label = input.required<string>();
  readonly variant = input<keyof typeof VARIANT_CLASSES>('primary');
  readonly prepare = input.required<() => Promise<Card[]>>();
  readonly source = input.required<StudySource>();
  /** El aviso de "al día" de esa entrada (en Hoy no aplica: el botón se deshabilita con 0). */
  readonly emptyMessage = input('');
  readonly errorMessage = input.required<string>();
  readonly disabled = input(false);

  private readonly handoff = inject(StudyHandoffService);
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
      const cards = await this.prepare()();
      if (cards.length === 0) {
        this.state.set('empty');
        return;
      }
      this.handoff.hand({ cards, source: this.source() });
      await this.router.navigateByUrl('/repaso');
      this.state.set('idle');
    } catch (error) {
      this.logger.error(this.errorMessage(), error);
      this.state.set('error');
    }
  }
}
