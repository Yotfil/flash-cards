// Genera `src/app/core/build-info.ts` con los datos del build: fecha-hora y commit de git.
// Se ejecuta solo, antes de `npm start` / `npm run build` (hooks pre* de npm) y tras `npm install`
// (postinstall), para que el archivo exista siempre. El resultado NO se versiona (.gitignore):
// cambia en cada build y versionarlo ensuciaría cada commit.

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(projectRoot, 'src', 'app', 'core', 'build-info.ts');

// Hash corto del commit actual (7 caracteres, ej. "c0fe09c"). Si git no está disponible
// (p. ej. un zip sin historial), se avisa y se usa un marcador en vez de romper el build.
let commit = 'sin-git';
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: projectRoot }).toString().trim();
} catch (error) {
  console.warn('[build-info] No se pudo leer el commit de git:', error.message);
}

const builtAt = new Date().toISOString();

const content = `// ARCHIVO GENERADO por scripts/generate-build-info.mjs — NO editar a mano.
// Datos del momento del build; el footer los muestra junto a la versión de package.json.

export const BUILD_INFO = {
  /** Hash corto del commit de git del que salió este build. */
  commit: '${commit}',
  /** Fecha-hora del build en ISO 8601 (UTC); la UI la formatea en hora local. */
  builtAt: '${builtAt}',
} as const;
`;

writeFileSync(outputPath, content);
console.log(`[build-info] Generado ${outputPath} (commit ${commit}, ${builtAt})`);
