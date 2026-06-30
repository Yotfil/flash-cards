import { Component } from '@angular/core';

import { APP_VERSION } from '@core/app-version';

/** Footer chiquito con la versión de la app (semver de package.json). Discreto, reutilizable.
 *  Solo pinta; el número viene de la fuente única `APP_VERSION`. */
@Component({
  selector: 'app-version-footer',
  imports: [],
  templateUrl: './version-footer.component.html',
  styleUrl: './version-footer.component.scss',
})
export class VersionFooterComponent {
  protected readonly version = APP_VERSION;
}
