import type { ThemePreference } from '../models/theme-preference';

// Puerto del tema: aplicarlo al documento y recordar la última preferencia en el dispositivo.
// El servicio de tema no toca el navegador (capas); el adaptador sí.
export abstract class ThemePort {
  /** Aplica la preferencia al documento y la recuerda para el próximo arranque. */
  abstract apply(preference: ThemePreference): void;
  /** La última preferencia recordada, o `null` si no hay ninguna válida. */
  abstract remembered(): ThemePreference | null;
}
