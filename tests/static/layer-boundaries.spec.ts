import { ESLint } from 'eslint';

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
});
