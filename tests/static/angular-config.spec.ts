import { readProjectJson } from './read-project-file';

// Lo que angular.json debe garantizar: la misma cabecera COOP en el servidor de desarrollo (el
// login de Google abre una ventana emergente), el entorno de producción sustituido en el build
// y el service worker solo en producción. Y que el lint mire también tests/: las reglas del
// contrato (cero `any`, ningún `catch` vacío) valen para las pruebas.

interface BuildConfiguration {
  fileReplacements?: { replace: string; with: string }[];
  serviceWorker?: string;
}

interface AngularJson {
  projects: Record<
    string,
    {
      architect: {
        build: {
          options: BuildConfiguration;
          configurations: Record<string, BuildConfiguration>;
        };
        serve: { options: { headers?: Record<string, string> } };
        lint: { options: { lintFilePatterns: string[] } };
      };
    }
  >;
}

describe('angular.json', () => {
  const angularJson = readProjectJson('angular.json') as AngularJson;
  const architect = angularJson.projects['flash-cards']?.architect;

  it('el servidor de desarrollo envía COOP same-origin-allow-popups', () => {
    expect(architect?.serve.options.headers?.['Cross-Origin-Opener-Policy']).toBe(
      'same-origin-allow-popups',
    );
  });

  it('el build de producción sustituye el entorno de desarrollo por el de producción', () => {
    expect(architect?.build.configurations['production']?.fileReplacements).toEqual([
      {
        replace: 'src/environments/environment.ts',
        with: 'src/environments/environment.production.ts',
      },
    ]);
  });

  it('el service worker solo se genera en la configuración de producción', () => {
    expect(architect?.build.configurations['production']?.serviceWorker).toBe('ngsw-config.json');
    expect(architect?.build.options.serviceWorker).toBeUndefined();
    expect(architect?.build.configurations['development']?.serviceWorker).toBeUndefined();
  });

  it('el lint revisa también las pruebas de tests/', () => {
    expect(architect?.lint.options.lintFilePatterns).toContain('tests/**/*.ts');
  });
});
