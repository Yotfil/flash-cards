import { pluralize } from '@shared/text/pluralize';

// Textos de Progreso, centralizados (ADR 0002: copy por feature). Voz cálida, breve, serena.
export const PROGRESO_COPY = {
  title: 'Progreso',
  pendingToday: 'Pendientes hoy',
  reviewedToday: 'Repasadas hoy',
  ratingsTitle: 'Calificaciones de hoy',
  noRatingsToday: 'Aún no has calificado tarjetas hoy.',
  collectionTitle: 'Tu colección',
  newCards: 'Nuevas',
  learning: 'En aprendizaje',
  review: 'Dominadas',
  collectionOffline: 'Necesitas conexión para contar tu colección.',
  collectionError: 'No pudimos contar tu colección.',
  retry: 'Reintentar',
  emptyTitle: 'Aún no hay nada que mostrar',
  emptyMessage:
    'Tus estadísticas aparecerán aquí en cuanto agregues tarjetas y empieces a repasar.',
  errorTitle: 'No pudimos cargar tus estadísticas',
  errorMessage: 'No se pudieron cargar tus estadísticas.',
} as const;

/** "10 tarjetas en total", "1 tarjeta en total". */
export function collectionTotal(count: number): string {
  return `${pluralize(count, 'tarjeta', 'tarjetas')} en total`;
}

/** Lo que dice la barra apilada a un lector de pantalla: "3 nuevas, 2 en aprendizaje, 5 dominadas". */
export function collectionBarLabel(newCards: number, learning: number, review: number): string {
  return `${pluralize(newCards, 'nueva', 'nuevas')}, ${learning} en aprendizaje, ${pluralize(review, 'dominada', 'dominadas')}`;
}
