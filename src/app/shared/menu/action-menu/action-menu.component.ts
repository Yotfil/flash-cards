import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { Component, input, output } from '@angular/core';

import { IconComponent, type IconName } from '../../icon/icon.component';

export interface ActionMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  /** Acción que destruye algo: se pinta con el color de peligro. */
  readonly destructive?: boolean;
}

// Menú de acciones de una fila (botón `⋯`) sobre el menú del CDK: navegación por teclado, Escape
// cierra y el foco vuelve al botón. El panel es sólido (flota sobre filas de acrílico). Solo emite
// el id de la acción elegida; la fila decide qué hacer.
@Component({
  selector: 'app-action-menu',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, IconComponent],
  templateUrl: './action-menu.component.html',
  styleUrl: './action-menu.component.scss',
})
export class ActionMenuComponent {
  /** Nombre accesible del botón, por ejemplo "Acciones de «to give up»". */
  readonly label = input.required<string>();
  readonly items = input.required<readonly ActionMenuItem[]>();
  readonly disabled = input(false);
  readonly selected = output<string>();
}
