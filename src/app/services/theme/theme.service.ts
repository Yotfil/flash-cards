import { Injectable, effect, inject, signal } from '@angular/core';

import type { ThemePreference } from '@domain/models/theme-preference';
import { ThemePort } from '@domain/ports/theme.port';

// Fuente única de la preferencia de tema en la app. Arranca con lo recordado en el dispositivo
// (o `system`) y aplica cada cambio al documento. Ajustes la conecta al perfil del usuario.
// Se instancia en el arranque (provideAppInitializer) para que la primera pantalla ya salga con
// el tema correcto.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themePort = inject(ThemePort);

  readonly preference = signal<ThemePreference>(this.themePort.remembered() ?? 'system');

  constructor() {
    effect(() => this.themePort.apply(this.preference()));
  }
}
