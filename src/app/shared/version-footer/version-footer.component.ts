import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';

import { APP_VERSION } from '@core/app-version';
import { BUILD_INFO } from '@core/build-info';

/** Footer chiquito con la versión de la app (semver de package.json), el commit de git y la
 *  fecha-hora del build. Solo pinta; los datos vienen de `APP_VERSION` y `BUILD_INFO`. */
@Component({
  selector: 'app-version-footer',
  imports: [DatePipe],
  templateUrl: './version-footer.component.html',
  styleUrl: './version-footer.component.scss',
})
export class VersionFooterComponent {
  protected readonly version = APP_VERSION;
  protected readonly commit = BUILD_INFO.commit;
  protected readonly builtAt = BUILD_INFO.builtAt;
}
