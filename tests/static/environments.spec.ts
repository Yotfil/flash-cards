import { environment as development } from '../../src/environments/environment';
import { environment as production } from '../../src/environments/environment.production';

// Desarrollo corre contra los emuladores bajo un proyecto de demostración (Firebase trata los
// `demo-*` como solo-emulador, así que nada toca la nube); producción, contra el proyecto real.

describe('entornos', () => {
  it('desarrollo usa el proyecto de demostración y los emuladores locales', () => {
    expect(development.production).toBe(false);
    expect(development.firebase.projectId?.startsWith('demo-')).toBe(true);
    expect(development.emulators).toEqual({
      firestore: { host: '127.0.0.1', port: 8080 },
      auth: { url: 'http://127.0.0.1:9099' },
    });
  });

  it('producción usa el proyecto real y ningún emulador', () => {
    expect(production.production).toBe(true);
    expect(production.emulators).toBeNull();
    expect(production.firebase.projectId).toBe('flash-cards-aca86');
  });
});
