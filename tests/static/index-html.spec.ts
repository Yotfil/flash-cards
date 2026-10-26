import { THEME_STORAGE_KEY } from '@infrastructure/browser/document-theme.adapter';

import { readProjectFile } from './read-project-file';

// Metadatos del documento: idioma, título, favicon vectorial, color de la barra del navegador
// según el esquema del sistema e instalación en iOS (Safari no usa el manifest para esto). Y el
// script de arranque, que aplica el tema elegido antes de la primera pintura.

interface FakeMeta {
  dataset: { scheme: string };
  media: string;
}

/** Ejecuta el script en línea del <head> con un documento y un almacenamiento de mentira. */
function runThemeBootScript(html: string, stored: () => string | null) {
  const head = html.slice(0, html.indexOf('</head>'));
  const script = /<script>([\s\S]*?)<\/script>/.exec(head)?.[1];
  if (script === undefined) {
    throw new Error('index.html no tiene un script en línea en el <head>.');
  }
  const root = { dataset: {} as Record<string, string> };
  const metas: FakeMeta[] = [
    { dataset: { scheme: 'light' }, media: '(prefers-color-scheme: light)' },
    { dataset: { scheme: 'dark' }, media: '(prefers-color-scheme: dark)' },
  ];
  const fakeDocument = { documentElement: root, querySelectorAll: () => metas };
  const fakeStorage = { getItem: (key: string) => (key === THEME_STORAGE_KEY ? stored() : null) };
  new Function('document', 'localStorage', script)(fakeDocument, fakeStorage);
  return { theme: root.dataset['theme'], media: metas.map((meta) => meta.media) };
}

describe('index.html', () => {
  const html = readProjectFile('src/index.html');

  it('declara el idioma español y el título Cadence', () => {
    expect(html).toMatch(/<html lang="es">/);
    expect(html).toMatch(/<title>Cadence<\/title>/);
  });

  it('usa un favicon vectorial', () => {
    expect(html).toMatch(/<link rel="icon" type="image\/svg\+xml" href="favicon\.svg" \/>/);
  });

  it('colorea la barra del navegador con el lienzo claro u oscuro según el sistema', () => {
    expect(html).toMatch(
      /<meta\s+name="theme-color"\s+data-scheme="light"\s+media="\(prefers-color-scheme: light\)"\s+content="#eef1f8"\s*\/>/,
    );
    expect(html).toMatch(
      /<meta\s+name="theme-color"\s+data-scheme="dark"\s+media="\(prefers-color-scheme: dark\)"\s+content="#0b0c22"\s*\/>/,
    );
  });

  describe('antes de pintar aplica el tema elegido en este dispositivo', () => {
    it('con "Claro" recordado, la primera pantalla ya es clara y la barra también', () => {
      expect(runThemeBootScript(html, () => 'light')).toEqual({
        theme: 'light',
        media: ['all', 'not all'],
      });
    });

    it('con "Oscuro" recordado, oscura', () => {
      expect(runThemeBootScript(html, () => 'dark')).toEqual({
        theme: 'dark',
        media: ['not all', 'all'],
      });
    });

    it('con "Sistema", nada recordado o un valor que no vale, sigue al sistema', () => {
      const system = {
        theme: undefined,
        media: ['(prefers-color-scheme: light)', '(prefers-color-scheme: dark)'],
      };
      expect(runThemeBootScript(html, () => 'system')).toEqual(system);
      expect(runThemeBootScript(html, () => null)).toEqual(system);
      expect(runThemeBootScript(html, () => 'sepia')).toEqual(system);
    });

    it('si el almacenamiento no se deja leer (modo privado), sigue al sistema sin romper el arranque', () => {
      const blocked = () => {
        throw new Error('SecurityError');
      };
      expect(runThemeBootScript(html, blocked).theme).toBeUndefined();
    });
  });

  it('se instala en iOS como Cadence con su icono táctil de 192 píxeles', () => {
    expect(html).toMatch(/<meta name="apple-mobile-web-app-capable" content="yes" \/>/);
    expect(html).toMatch(/<meta name="apple-mobile-web-app-title" content="Cadence" \/>/);
    expect(html).toMatch(
      /<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" \/>/,
    );
    expect(html).toMatch(/<link rel="apple-touch-icon" href="icons\/icon-192x192\.png" \/>/);
  });
});
