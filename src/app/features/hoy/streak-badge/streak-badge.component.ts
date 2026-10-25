import { Component, computed, input } from '@angular/core';

import { IconComponent } from '@shared/icon/icon.component';

import { HOY_COPY, streakLabel } from '../hoy.copy';

// Racha discreta junto al título de Hoy: sin racha (o si no se pudo leer) no pinta nada.
@Component({
  selector: 'app-streak-badge',
  imports: [IconComponent],
  templateUrl: './streak-badge.component.html',
  styleUrl: './streak-badge.component.scss',
})
export class StreakBadgeComponent {
  readonly days = input.required<number | null>();

  protected readonly label = computed(() => streakLabel(this.days() ?? 0));
  protected readonly ariaLabel = computed(() => {
    const label = this.label();
    return label ? HOY_COPY.streakAria(label) : null;
  });
}
