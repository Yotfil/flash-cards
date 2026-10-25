// Valores por defecto del ritmo de estudio, fuente única para perfiles, libros e importación.

/**
 * Tarjetas nuevas por día con las que nace un libro (y default global del perfil). Es la perilla
 * principal del ritmo: cada tarjeta nueva genera varios repasos futuros.
 */
export const DEFAULT_NEW_CARDS_PER_DAY = 20;

/** Tope de repasos por día con el que nace un libro. 0 = sin tope. */
export const DEFAULT_MAX_REVIEWS_PER_DAY = 200;

/**
 * Sugerir un grado por la velocidad de recuerdo al revelar: activado por defecto. Fuente única
 * para la creación del perfil y para leer perfiles creados antes de que existiera el ajuste.
 */
export const DEFAULT_AUTO_GRADE_BY_TIME = true;

/** Ítems que admite un paquete de práctica nuevo (ajuste "Ítems por paquete"). */
export const DEFAULT_PRACTICE_PACKAGE_CAPACITY = 20;
