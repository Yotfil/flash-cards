import { readProjectFile } from './read-project-file';

// Metadatos del documento: idioma, título, favicon vectorial, color de la barra del navegador
// según el esquema del sistema e instalación en iOS (Safari no usa el manifest para esto).

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
      /<meta name="theme-color" media="\(prefers-color-scheme: light\)" content="#eef1f8" \/>/,
    );
    expect(html).toMatch(
      /<meta name="theme-color" media="\(prefers-color-scheme: dark\)" content="#0b0c22" \/>/,
    );
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
