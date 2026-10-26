import { readProjectJson } from './read-project-file';

// El caparazón que el service worker precarga solo puede listar archivos que el build genera:
// una ruta fantasma rompe la precarga (hallazgo 9: `/favicon.ico` e `/index.csr.html` no existen).

interface NgswConfig {
  assetGroups: { name: string; resources: { files: string[] } }[];
}

describe('ngsw-config.json', () => {
  const config = readProjectJson('ngsw-config.json') as NgswConfig;
  const appFiles = config.assetGroups.find((group) => group.name === 'app')?.resources.files;

  it('el grupo app no lista archivos que no existen', () => {
    expect(appFiles).not.toContain('/favicon.ico');
    expect(appFiles).not.toContain('/index.csr.html');
  });

  it('el grupo app precarga el documento, el favicon vectorial, el manifest, estilos y scripts', () => {
    expect(appFiles).toEqual(
      expect.arrayContaining([
        '/favicon.svg',
        '/index.html',
        '/manifest.webmanifest',
        '/*.css',
        '/*.js',
      ]),
    );
  });
});
