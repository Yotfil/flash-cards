// Preferencia de tema del usuario: forzar claro, forzar oscuro o seguir al sistema.
export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

/** Valida un valor externo (lo recordado en el navegador, el perfil) antes de usarlo. */
export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}
