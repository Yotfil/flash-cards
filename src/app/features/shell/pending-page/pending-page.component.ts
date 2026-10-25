import { Component } from '@angular/core';

import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';

import { SHELL_COPY } from '../shell.copy';

// Página provisional de las rutas cuya pantalla todavía no existe. Cada capacidad sustituye la
// suya en `app.routes.ts`.
@Component({
  selector: 'app-pending-page',
  imports: [EmptyStateComponent],
  templateUrl: './pending-page.component.html',
  styleUrl: './pending-page.component.scss',
})
export class PendingPageComponent {
  protected readonly copy = SHELL_COPY;
}
