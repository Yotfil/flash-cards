// Preferencia de tema del usuario: forzar claro, forzar oscuro o seguir al sistema.
export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** Valida un valor externo (lo recordado en el navegador, el perfil) antes de usarlo. */
export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}
