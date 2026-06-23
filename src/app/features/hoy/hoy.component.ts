import { Component } from '@angular/core';

import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';

/** Pantalla "Hoy": la cola del día. Placeholder de Fase 0; la sesión de repaso y la cola
 *  real llegan en Fase 1. */
@Component({
  selector: 'app-hoy',
  imports: [EmptyStateComponent],
  template: `
    <h1 class="px-6 pt-6 text-2xl font-semibold text-text-primary">Hoy</h1>
    <app-empty-state
      title="Nada que repasar por ahora"
      message="Cuando agregues tarjetas a tus libros, tu cola del día aparecerá aquí."
    />
  `,
})
export class HoyComponent {}
