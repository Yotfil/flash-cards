import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MainNavComponent } from '../main-nav/main-nav.component';
import { OfflineIndicatorComponent } from '../offline-indicator/offline-indicator.component';

// Caparazón de las cuatro secciones: ocupa exactamente la altura visible; la navegación queda
// fija (abajo en móvil, a la izquierda en escritorio) y el contenido es la única región con
// scroll, centrada con un ancho máximo de lectura.
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, MainNavComponent, OfflineIndicatorComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {}
