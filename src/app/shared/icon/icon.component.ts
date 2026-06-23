import { Component, input } from '@angular/core';

export type IconName = 'calendar' | 'books' | 'chart' | 'sliders';

/** Icono SVG de trazo, presentacional. Toma el color del texto (currentColor), por lo que
 *  respeta los tokens del contenedor. Decorativo: el significado lo da el texto vecino. */
@Component({
  selector: 'app-icon',
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-6 w-6"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('calendar') {
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18M8 2v4M16 2v4" />
        }
        @case ('books') {
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        }
        @case ('chart') {
          <path d="M6 20v-6M12 20V4M18 20v-10" />
        }
        @case ('sliders') {
          <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
        }
      }
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
}
