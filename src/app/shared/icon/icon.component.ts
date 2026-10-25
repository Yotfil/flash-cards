import { Component, computed, input } from '@angular/core';

/** Catálogo de iconos. Ampliarlo = añadir el nombre aquí y su trazo en la plantilla. */
export const ICON_NAMES = [
  'calendar',
  'books',
  'chart',
  'sliders',
  'alert',
  'brain',
  'check',
  'x',
  'spark',
  'offline',
  'trash',
  'edit',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

const SIZE_CLASSES = { sm: 'size-4', md: 'size-5' } as const;

// Icono de trazo: toma el color del texto que lo rodea (`currentColor`) y es decorativo (el
// significado lo da el texto vecino), así que se oculta a tecnologías de asistencia.
@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  // `data-icon` deja ver qué icono es en el DOM (pruebas y depuración) sin depender del trazo.
  host: { class: 'inline-flex shrink-0', '[attr.data-icon]': 'name()' },
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<keyof typeof SIZE_CLASSES>('md');

  protected readonly sizeClass = computed(() => SIZE_CLASSES[this.size()]);
}
