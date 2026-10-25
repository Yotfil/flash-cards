import { readProjectJson } from './read-project-file';

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

  it('package.json arranca ambos emuladores bajo el proyecto de demostración', () => {
    const packageJson = readProjectJson('package.json') as PackageJson;

    expect(packageJson.scripts['emulators']).toBe(
      'firebase emulators:start --only firestore,auth --project demo-cadence',
    );
  });
});
