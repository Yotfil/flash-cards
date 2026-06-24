import { Component, computed, input } from '@angular/core';

export type IconName =
  | 'calendar'
  | 'books'
  | 'chart'
  | 'sliders'
  | 'alert'
  | 'brain'
  | 'check'
  | 'x';
export type IconSize = 'sm' | 'md';

/** Icono SVG de trazo, presentacional. Toma el color del texto (currentColor), por lo que
 *  respeta los tokens del contenedor. Decorativo: el significado lo da el texto vecino. */
@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<IconSize>('md');

  protected readonly sizeClass = computed(() => (this.size() === 'sm' ? 'h-4 w-4' : 'h-6 w-6'));
}
