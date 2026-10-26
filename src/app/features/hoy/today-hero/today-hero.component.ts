import { Component, computed, input } from '@angular/core';

import { StudyLaunchButtonComponent } from '../../estudio/study-launch-button/study-launch-button.component';
import { HOY_COPY, heroCount } from '../hoy.copy';

// El protagonista de Hoy: cuántas tarjetas tocan y el botón para empezar, con una luz que recorre
// el borde mientras haya pendientes. Asentado ("al día") la luz se apaga y no hay botón. Es sólido:
// nunca vidrio sobre algo que se mueve (ADR 0003).
@Component({
  selector: 'app-today-hero',
  imports: [StudyLaunchButtonComponent],
  templateUrl: './today-hero.component.html',
  styleUrl: './today-hero.component.scss',
})
export class TodayHeroComponent {
  readonly count = input.required<number>();
  readonly settled = input(false);
  /** Prepara la sesión de Hoy, la entrega y dice cuántas tarjetas tiene. */
  readonly prepare = input.required<() => Promise<number>>();
  /** Vacía la bandeja si la sesión terminó de prepararse cuando ya no estás en Hoy. */
  readonly discard = input.required<() => void>();
  readonly disabled = input(false);

  protected readonly copy = HOY_COPY;
  protected readonly destination = ['/repaso'];
  protected readonly countLabel = computed(() => heroCount(this.count()));
}
