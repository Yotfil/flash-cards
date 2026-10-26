import { ESLint } from 'eslint';

import { readProjectFile } from './read-project-file';
import { listFiles } from './source-files';

// Las fronteras de capas (ADR 0001) las exige ESLint desde el ADR 0002. Estas pruebas pasan código
// de ejemplo por la configuración real del proyecto y miran su veredicto: un cruce que la
// configuración deje pasar no lo atrapa nadie más. Los archivos no existen; solo cuenta su ruta.

const eslint = new ESLint();

async function ruleIdsFor(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((message) => message.ruleId ?? 'error de sintaxis');
}

describe('fronteras de capas', () => {
  it('features/ no carga infrastructure/ con un import() dinámico', async () => {
    const code = [
      'export async function loadRepository() {',
      "  return import('@infrastructure/firestore/card.repository.firestore');",
      '}',
      '',
    ].join('\n');

    expect(await ruleIdsFor('src/app/features/zz-frontera.ts', code)).toContain(
      'no-restricted-syntax',
    );
  });

  it('las rutas de la raíz sí cargan pantallas con import()', async () => {
    const code = [
      'export const loadHoy = () =>',
      "  import('@features/hoy/hoy-page/hoy-page.component').then((module) => module.HoyPageComponent);",
      '',
    ].join('\n');

    expect(await ruleIdsFor('src/app/zz-frontera.routes.ts', code)).toEqual([]);
  });

  // Los fakes de testing/ implementan puertos de domain/: nunca el adaptador real ni Firebase.
  it.each([
    ['Firebase', "import { doc } from 'firebase/firestore';\n\nexport const fake = doc;\n"],
    [
      'infrastructure/',
      "import { FirestoreCardRepository } from '@infrastructure/firestore/card.repository.firestore';\n\nexport const fake = FirestoreCardRepository;\n",
    ],
    [
      'features/',
      "import { BIBLIOTECA_COPY } from '@features/biblioteca/biblioteca.copy';\n\nexport const fake = BIBLIOTECA_COPY;\n",
    ],
    [
      'core/',
      "import { provideCore } from '@core/provide-core';\n\nexport const fake = provideCore;\n",
    ],
  ])('testing/ no importa %s', async (_layer, code) => {
    expect(await ruleIdsFor('src/app/testing/zz-frontera.ts', code)).toContain(
      '@typescript-eslint/no-restricted-imports',
    );
  });

  it('un fake de testing/ sí importa los puertos de domain/', async () => {
    const code = [
      "import type { Logger } from '@domain/ports/logger.port';",
      '',
      'export type FakeLoggerShape = Logger;',
      '',
    ].join('\n');

    expect(await ruleIdsFor('src/app/testing/zz-frontera.ts', code)).toEqual([]);
  });
});

// Leer "lo guardado en el dispositivo" es un detalle del almacén: las capas de arriba piden un
// origen (`'device' | 'server'`) y solo el adaptador sabe cómo se lee la caché.
describe('lectura desde la caché del dispositivo', () => {
  it('solo la infraestructura llama a la caché de Firestore', () => {
    const callers = listFiles('src/app')
      .filter((path) => path.endsWith('.ts'))
      .filter((path) => /getDocs?FromCache/.test(readProjectFile(path)));

    expect(callers.length).toBeGreaterThan(0);
    expect(callers.filter((path) => !path.startsWith('src/app/infrastructure/'))).toEqual([]);
  });
});
