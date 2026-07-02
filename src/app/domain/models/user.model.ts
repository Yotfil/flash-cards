// Perfil y ajustes del usuario (`/users/{uid}`). Especificación §6.3.

/**
 * Default global de tarjetas nuevas por día (espec. §6.4). Es la perilla principal del ritmo de
 * estudio: cada nueva tarjeta genera ~5-9 repasos futuros, así que con backlog conviene bajarla.
 * Vive en el dominio (no en un servicio) para ser fuente única sin crear dependencias entre capas.
 */
export const DEFAULT_NEW_CARDS_PER_DAY = 20;

/**
 * Tope por defecto de repasos por día de un libro nuevo (espec. §6.4). 0 = sin tope. Vive junto a
 * {@link DEFAULT_NEW_CARDS_PER_DAY} en el dominio: fuente única para formularios e importación.
 */
export const DEFAULT_MAX_REVIEWS_PER_DAY = 200;

/** Tema de la interfaz elegido por el usuario. */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Ajustes globales del usuario. `timezone` y `dayStartHour` no son adorno: definen el
 * límite del "día" para el tope de tarjetas nuevas y para las estadísticas diarias.
 */
export interface UserSettings {
  /** Zona horaria IANA, ej. "America/Bogota". Define cuándo es "hoy". */
  timezone: string;
  /** Hora a la que arranca el día de estudio, ej. 4 (un repaso a la 1am cuenta como ayer). */
  dayStartHour: number;
  theme: ThemePreference;
  /**
   * Tarjetas nuevas por día con las que se precarga un libro nuevo. Es solo el valor por defecto:
   * cada libro guarda su propio `newCardsPerDay` y puede ajustarse aparte. Default
   * {@link DEFAULT_NEW_CARDS_PER_DAY}.
   */
  defaultNewCardsPerDay: number;
  /**
   * Si está activo, al revelar la respuesta se SUGIERE un grado según la velocidad de recuerdo (el
   * usuario sigue confirmando; nunca califica solo). Asiste, no automatiza. Default true.
   */
  autoGradeByTime: boolean;
}

export interface User {
  /** Igual al uid de autenticación. */
  id: string;
  displayName: string;
  email: string;
  createdAt: Date;
  settings: UserSettings;

  // --- Campos sociales: sembrados y apagados (Principio 4). Sin efecto en el MVP. ---
  /** Nombre de usuario único y público (futuro social). */
  handle?: string;
  /** Avatar (futuro social). */
  photoURL?: string;
  /** ¿Otros pueden encontrarme? Privacidad. Default false. */
  isSearchable: boolean;
}
