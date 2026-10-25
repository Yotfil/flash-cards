import { Component, computed, input } from '@angular/core';

import type { Card } from '@domain/models/card.model';
import type { StudySource } from '@services/queue/study-handoff.service';

import { StudyLaunchButtonComponent } from '../../estudio/study-launch-button/study-launch-button.component';
import { HOY_COPY, heroCount } from '../hoy.copy';

const TODAY: StudySource = { kind: 'today' };

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
  readonly prepare = input.required<() => Promise<Card[]>>();
  readonly disabled = input(false);

  protected readonly copy = HOY_COPY;
  protected readonly source = TODAY;
  protected readonly countLabel = computed(() => heroCount(this.count()));
}
