import { DOCUMENT, Injectable, inject } from '@angular/core';

import { isThemePreference, type ThemePreference } from '@domain/models/theme-preference';
import { Logger } from '@domain/ports/logger.port';
import { ThemePort } from '@domain/ports/theme.port';

/** Clave única en `localStorage` de la última preferencia de tema aplicada. */
export const THEME_STORAGE_KEY = 'cadence.theme';

// Adaptador del tema sobre el documento: `light`/`dark` fijan `data-theme` en <html> (el archivo
// de tema lo respeta por encima de la preferencia del sistema) y `system` lo quita. La barra del
// navegador lo sigue: de las dos etiquetas `theme-color` de index.html (una por esquema, con su
// color), un tema elegido deja activa solo la suya. La preferencia se recuerda en `localStorage`
// para el próximo arranque (el script de index.html la aplica antes de pintar). En modo privado o
// con el almacenamiento lleno `localStorage` puede lanzar: el tema se aplica igual y solo se avisa.
@Injectable()
export class DocumentThemeAdapter extends ThemePort {
  private readonly document = inject(DOCUMENT);
  private readonly logger = inject(Logger);

  apply(preference: ThemePreference): void {
    const root = this.document.documentElement;
    if (preference === 'system') {
      delete root.dataset['theme'];
    } else {
      root.dataset['theme'] = preference;
    }
    this.paintBrowserBar(preference);
    this.remember(preference);
  }

  /** Con "sistema", cada etiqueta vuelve a su esquema; con un tema, solo la suya cuenta. */
  private paintBrowserBar(preference: ThemePreference): void {
    const metas = this.document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"][data-scheme]',
    );
    for (const meta of metas) {
      const scheme = meta.dataset['scheme'];
      if (preference === 'system') {
        meta.media = `(prefers-color-scheme: ${scheme})`;
      } else {
        meta.media = scheme === preference ? 'all' : 'not all';
      }
    }
  }

  remembered(): ThemePreference | null {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
      return isThemePreference(stored) ? stored : null;
    } catch (error) {
      this.logger.warn('No se pudo leer el tema recordado; se sigue al sistema', error);
      return null;
    }
  }

  private remember(preference: ThemePreference): void {
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch (error) {
      this.logger.warn('No se pudo recordar el tema en este dispositivo', error);
    }
  }
}
