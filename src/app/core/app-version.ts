// Versión de la app: fuente ÚNICA = el campo `version` de package.json (convención npm).
// El proceso de release la sube en la rama `version/X.Y.Z`; el footer la lee de aquí, así no hay
// que mantener el número en dos sitios. Único archivo que importa package.json.

import packageJson from '../../../package.json';

export const APP_VERSION: string = packageJson.version;
