// Valores por defecto del ritmo de estudio, fuente única para perfiles, libros e importación.

/**
 * Tarjetas nuevas por día con las que nace un libro (y default global del perfil). Es la perilla
 * principal del ritmo: cada tarjeta nueva genera varios repasos futuros.
 */
export const DEFAULT_NEW_CARDS_PER_DAY = 20;

/** Tope de repasos por día con el que nace un libro. 0 = sin tope. */
export const DEFAULT_MAX_REVIEWS_PER_DAY = 200;
