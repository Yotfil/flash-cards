import { Component } from '@angular/core';

import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';

/** Pantalla "Progreso": estadísticas de estudio. Placeholder de Fase 0; las métricas reales
 *  llegan en Fase 1 (y el diagnóstico de debilidades, más adelante). */
@Component({
  selector: 'app-progreso',
  imports: [EmptyStateComponent],
  template: `
    <h1 class="px-6 pt-6 text-2xl font-semibold text-text-primary">Progreso</h1>
    <app-empty-state
      title="Aún no hay nada que mostrar"
      message="Tus estadísticas de estudio aparecerán aquí en cuanto empieces a repasar."
    />
  `,
})
export class ProgresoComponent {}
