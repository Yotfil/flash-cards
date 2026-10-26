import { readProjectFile } from './read-project-file';

// Accesibilidad como base: anillo de foco visible para el teclado, documento en español con la
// vista adaptada a las zonas seguras y un mensaje cuando no hay JavaScript.

describe('accesibilidad base', () => {
  const theme = readProjectFile('src/styles.scss');
  const html = readProjectFile('src/index.html');

  it('todo control enfocado con teclado muestra un anillo de 2px con el acento', () => {
    expect(theme).toMatch(
      /:focus-visible \{\s*outline: 2px solid var\(--color-accent\);\s*outline-offset: 3px;/,
    );
  });

  it('respeta "reducir movimiento"', () => {
    expect(theme).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('el documento está en español y la vista cubre las zonas seguras', () => {
    expect(html).toMatch(/<html lang="es">/);
    expect(html).toMatch(/<meta name="viewport" content="[^"]*viewport-fit=cover[^"]*" \/>/);
  });

  it('sin JavaScript se lee el aviso exacto', () => {
    expect(html).toMatch(/<noscript>Activa JavaScript para usar la aplicación\.<\/noscript>/);
  });
});
