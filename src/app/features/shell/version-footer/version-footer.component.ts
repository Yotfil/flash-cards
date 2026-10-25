import { Component, inject } from '@angular/core';

import { BUILD_DETAILS } from '@core/app-version';
import { formatBuildDate, formatVersionLine } from '@services/version/version-format';

// Pie de versión discreto: `v{versión} · {commit}` y la fecha-hora del build en hora local. Sirve
// para saber qué build está desplegado. No lo pinta el caparazón: lo coloca la pantalla que lo
// usa (Ajustes, al final).
@Component({
  selector: 'app-version-footer',
  templateUrl: './version-footer.component.html',
  styleUrl: './version-footer.component.scss',
})
export class VersionFooterComponent {
  private readonly build = inject(BUILD_DETAILS);

  protected readonly versionLine = formatVersionLine(this.build.version, this.build.commit);
  protected readonly buildDate = formatBuildDate(this.build.builtAt);
}
