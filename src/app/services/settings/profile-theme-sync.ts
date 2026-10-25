import { Injectable, effect, inject } from '@angular/core';

import { SessionService } from '@services/session/session.service';
import { ThemeService } from '@services/theme/theme.service';

// Con sesión activa, el tema guardado en el perfil manda sobre lo recordado en el navegador:
// así el documento y el perfil nunca discrepan. Se arranca con la app (provideAppInitializer).
@Injectable({ providedIn: 'root' })
export class ProfileThemeSync {
  constructor() {
    const session = inject(SessionService);
    const theme = inject(ThemeService);
    effect(() => {
      const state = session.state();
      if (state.kind === 'active') {
        theme.preference.set(state.user.settings.theme);
      }
    });
  }
}
