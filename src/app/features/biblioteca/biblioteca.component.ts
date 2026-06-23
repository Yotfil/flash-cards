import { Component } from '@angular/core';

import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';

/** Pantalla "Biblioteca": libros y capítulos. Placeholder de Fase 0; el CRUD de libros y
 *  tarjetas, y la importación, llegan en Fase 1. */
@Component({
  selector: 'app-biblioteca',
  imports: [EmptyStateComponent],
  template: `
    <h1 class="px-6 pt-6 text-2xl font-semibold text-text-primary">Biblioteca</h1>
    <app-empty-state
      title="Aún no tienes libros"
      message="Crea tu primer libro para empezar a organizar tus tarjetas por tema."
    />
  `,
})
export class BibliotecaComponent {}
