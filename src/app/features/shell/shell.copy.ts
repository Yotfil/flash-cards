import type { IconName } from '@shared/icon/icon.component';

// Textos y destinos del caparazón, centralizados (ADR 0002: copy por feature).

export const SHELL_COPY = {
  brand: 'Cadence',
  navLabel: 'Navegación principal',
  offline: 'Sin conexión. Tus repasos se guardan aquí y se sincronizan al volver.',
  pendingTitle: 'Pronto',
  pendingMessage: 'Esta pantalla llega en un próximo paso.',
} as const;

export interface NavDestination {
  /** Primer segmento de la ruta: también decide qué destino está activo. */
  readonly section: string;
  readonly label: string;
  readonly icon: IconName;
}

/** Los cuatro destinos de la navegación principal, en su orden. */
export const NAV_DESTINATIONS: readonly NavDestination[] = [
  { section: 'hoy', label: 'Hoy', icon: 'calendar' },
  { section: 'biblioteca', label: 'Biblioteca', icon: 'books' },
  { section: 'progreso', label: 'Progreso', icon: 'chart' },
  { section: 'ajustes', label: 'Ajustes', icon: 'sliders' },
];
