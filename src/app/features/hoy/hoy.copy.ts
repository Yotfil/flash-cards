import { pluralize } from '@shared/text/pluralize';

// Textos de Hoy, centralizados (ADR 0002: copy por feature). Voz cálida, breve, serena.

export const HOY_COPY = {
  title: 'Hoy',
  loadError: 'No pudimos cargar tu cola de hoy',
  loadErrorMessage: 'Revisa tu conexión e inténtalo de nuevo.',
  welcomeTitle: 'Te damos la bienvenida a Cadence',
  welcomeMessage: 'Crea o importa tu primer libro para empezar a estudiar.',
  goToLibrary: 'Ir a la Biblioteca',
  heroSubtitle: 'Listas para repasar hoy',
  settledTitle: 'Estás al día',
  settledMessage: 'Nada pendiente por ahora. Vuelve mañana o estudia un libro.',
  studyNow: 'Estudiar ahora',
  studyError: 'No se pudo preparar la sesión. Inténtalo de nuevo.',
  perBook: 'Por libro',
  createOrImport: 'Crear o importar un libro',
  adjustTitle: 'Ajustar nuevas de hoy',
  adjustNote: 'Solo para la sesión de hoy. Tus libros no cambian.',
  noNewCards: 'sin nuevas',
  fewerNewOf: (bookName: string) => `Menos nuevas de ${bookName}`,
  moreNewOf: (bookName: string) => `Más nuevas de ${bookName}`,
  streakAria: (label: string) => `Racha: ${label}`,
} as const;

/** "21 tarjetas" / "1 tarjeta" en el bloque principal. */
export function heroCount(count: number): string {
  return pluralize(count, 'tarjeta', 'tarjetas');
}

/** "10 por repasar, 8 nuevas", omitiendo la parte que sea cero. */
export function bookPendingMeta(due: number, fresh: number): string {
  const parts: string[] = [];
  if (due > 0) {
    parts.push(`${due} por repasar`);
  }
  if (fresh > 0) {
    parts.push(pluralize(fresh, 'nueva', 'nuevas'));
  }
  return parts.join(', ');
}

/** Racha: nada con cero, "1 día", "N días seguidos" y "60+ días seguidos" en el tope. */
export function streakLabel(days: number, maxDays = 60): string | null {
  if (days <= 0) {
    return null;
  }
  if (days === 1) {
    return '1 día';
  }
  return days >= maxDays ? `${maxDays}+ días seguidos` : `${days} días seguidos`;
}

/** El máximo elegible en el control de ajuste: "de 20". */
export function newAvailableLabel(available: number): string {
  return `de ${available}`;
}
