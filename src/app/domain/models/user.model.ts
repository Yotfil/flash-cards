// Perfil y ajustes del usuario (`/users/{uid}`). Especificación §6.3.

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
