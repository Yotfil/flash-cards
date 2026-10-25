import type { ThemePreference } from './theme-preference';

// Perfil y ajustes del usuario (`/users/{uid}`).

/**
 * Ajustes globales. `timezone` y `dayStartHour` definen cuándo empieza "hoy" para la cola diaria
 * y las estadísticas.
 */
export interface UserSettings {
  /** Zona horaria IANA, por ejemplo "America/Bogota". */
  timezone: string;
  /** Hora a la que arranca el día de estudio (un repaso a la 1 a. m. con 4 cuenta como ayer). */
  dayStartHour: number;
  theme: ThemePreference;
  /** Nuevas por día con las que se precarga un libro nuevo; cada libro guarda la suya. */
  defaultNewCardsPerDay: number;
  /** Sugerir un grado por la velocidad de recuerdo al revelar (asiste, nunca califica solo). */
  autoGradeByTime: boolean;
  /** Capacidad con la que nace un paquete de práctica; los ya creados conservan la suya. */
  practicePackageCapacity: number;
  /** Plantilla propia del prompt de práctica; ausente = la plantilla por defecto. */
  promptTemplate?: string;
}

export interface User {
  /** Igual al identificador de la identidad autenticada. */
  id: string;
  displayName: string;
  email: string;
  createdAt: Date;
  settings: UserSettings;

  // Campos sociales: sembrados y apagados hasta la capa social (Principio 4).
  handle?: string;
  photoURL?: string;
  /** ¿Otros pueden encontrarme? Siempre `false` por ahora. */
  isSearchable: boolean;
}
