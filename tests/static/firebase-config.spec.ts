import { environment as development } from '../../src/environments/environment';
import { INTEGRATION_PROJECT_ID } from '../support/firestore-test-environment';
import { readProjectFile, readProjectJson } from './read-project-file';

// El hosting vive en Netlify: `firebase.json` solo describe Firestore y los emuladores locales
// (hallazgo 8: antes duplicaba un hosting sin cabeceras).

interface FirebaseConfig {
  hosting?: unknown;
  emulators: { firestore: { port: number }; auth?: { port: number } };
}

interface PackageJson {
  scripts: Record<string, string>;
}

describe('firebase.json y scripts de emuladores', () => {
  const firebase = readProjectJson('firebase.json') as FirebaseConfig;

  it('no declara hosting', () => {
    expect(firebase.hosting).toBeUndefined();
  });

  it('declara los emuladores de Firestore y de Auth en sus puertos', () => {
    expect(firebase.emulators.firestore.port).toBe(8080);
    expect(firebase.emulators.auth?.port).toBe(9099);
  });

  it('npm run emulators arranca ambos emuladores con datos persistentes', () => {
    const packageJson = readProjectJson('package.json') as PackageJson;
    const wrapper = readProjectFile('scripts/emulators.mjs');

    expect(packageJson.scripts['emulators']).toBe('node scripts/emulators.mjs');
    expect(wrapper).toMatch(/'--only',\s*'firestore,auth'/);
    expect(wrapper).toMatch(/'--project',\s*'demo-cadence'/);
    expect(wrapper).toMatch(/'--export-on-exit',\s*DATA_DIRECTORY/);
    expect(wrapper).toMatch(/hasExport \? \['--import', DATA_DIRECTORY\]/);
    expect(wrapper).toContain('firebase-export-metadata.json');
  });

  it('npm run seed:allowlist autoriza un correo en el emulador', () => {
    const packageJson = readProjectJson('package.json') as PackageJson;
    const seed = readProjectFile('scripts/seed-allowlist.mjs');

    expect(packageJson.scripts['seed:allowlist']).toBe('node scripts/seed-allowlist.mjs');
    expect(seed).toContain('Bearer owner');
    expect(seed).toContain('/v1/projects/demo-cadence/databases/(default)/documents/allowlist/');
  });

  // Cada prueba de integración vacía su proyecto. Si alguna llegara al emulador de desarrollo (por un
  // FIRESTORE_EMULATOR_HOST exportado a mano), con un proyecto propio solo vaciaría el suyo: el
  // emulador separa los datos por proyecto.
  it('la integración usa un proyecto propio, distinto del de desarrollo', () => {
    const packageJson = readProjectJson('package.json') as PackageJson;

    expect(INTEGRATION_PROJECT_ID).toMatch(/^demo-/);
    expect(INTEGRATION_PROJECT_ID).not.toBe(development.firebase.projectId);
    expect(readProjectFile('scripts/emulators.mjs')).not.toContain(`'${INTEGRATION_PROJECT_ID}'`);
    expect(packageJson.scripts['test:integration']).toContain(
      `--project ${INTEGRATION_PROJECT_ID} `,
    );
  });

  it('los datos del emulador no se versionan', () => {
    const ignored = readProjectFile('.gitignore')
      .split('\n')
      .map((line) => line.trim());

    expect(ignored).toContain('.emulator-data/');
  });
});
