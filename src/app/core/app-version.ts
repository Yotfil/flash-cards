import { InjectionToken } from '@angular/core';

import packageJson from '../../../package.json';

import { BUILD_INFO } from './build-info';

// Versión de la app: fuente ÚNICA = el campo `version` de package.json, el que sube el proceso de
// release en la rama `version/X.Y.Z`. Único archivo que importa package.json.
export const APP_VERSION: string = packageJson.version;

/** Lo que identifica un build: versión, commit del que salió y fecha-hora (ISO, UTC). */
export interface BuildDetails {
  readonly version: string;
  readonly commit: string;
  readonly builtAt: string;
}

// Los datos del build llegan por inyección para que las pruebas puedan simular otro build (por
// ejemplo, uno sin historial de git); por defecto son los reales.
export const BUILD_DETAILS = new InjectionToken<BuildDetails>('BUILD_DETAILS', {
  providedIn: 'root',
  factory: () => ({ version: APP_VERSION, commit: BUILD_INFO.commit, builtAt: BUILD_INFO.builtAt }),
});
