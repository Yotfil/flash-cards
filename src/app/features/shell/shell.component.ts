import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { IconComponent, type IconName } from '@shared/icon/icon.component';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

/** Caparazón de la app autenticada: navegación principal (lateral en escritorio, inferior en
 *  móvil) y el área de contenido donde se renderiza cada sección. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  protected readonly navItems: readonly NavItem[] = [
    { path: 'hoy', label: 'Hoy', icon: 'calendar' },
    { path: 'biblioteca', label: 'Biblioteca', icon: 'books' },
    { path: 'progreso', label: 'Progreso', icon: 'chart' },
    { path: 'ajustes', label: 'Ajustes', icon: 'sliders' },
  ];
}
