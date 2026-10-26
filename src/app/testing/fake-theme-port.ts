import type { ThemePreference } from '@domain/models/theme-preference';
import { ThemePort } from '@domain/ports/theme.port';

// Fake en memoria del puerto de tema: devuelve lo "recordado" que se le indique y acumula cada
// preferencia aplicada para que la prueba la inspeccione.
export class FakeThemePort extends ThemePort {
  readonly applied: ThemePreference[] = [];

  constructor(private readonly rememberedPreference: ThemePreference | null = null) {
    super();
  }

  apply(preference: ThemePreference): void {
    this.applied.push(preference);
  }

  remembered(): ThemePreference | null {
    return this.rememberedPreference;
  }
}
