import { readProjectFile } from './read-project-file';

// Tema oscuro base que sigue al sistema, con override por atributo, y superficies sólidas con
// "reducir transparencia". jsdom no aplica media queries ni calcula estilos: se afirma que el
// archivo de tema declara cada regla; el efecto visual se revisa a mano.

const theme = readProjectFile('src/styles.scss');

describe('archivo de tema: claro, oscuro y preferencias del sistema', () => {
  it('fuerza la paleta clara con el atributo de tema claro', () => {
    expect(theme).toMatch(/:root\[data-theme='light'\]\s*\{\s*@include light-palette;/);
  });

  it('sigue la preferencia clara del sistema salvo que el documento fije el oscuro', () => {
    expect(theme).toMatch(
      /@media \(prefers-color-scheme: light\)\s*\{\s*:root:not\(\[data-theme='dark'\]\)\s*\{\s*@include light-palette;/,
    );
  });

  it('la paleta clara es plana: sin desenfoque y con esquema de color claro', () => {
    const lightPalette = /@mixin light-palette \{([\s\S]*?)\n\}/.exec(theme)?.[1] ?? '';

    expect(lightPalette).toMatch(/--blur-glass: 0px;/);
    expect(lightPalette).toMatch(/--blur-glass-nav: 0px;/);
    expect(lightPalette).toMatch(/color-scheme: light;/);
  });

  it('el esquema base de controles nativos es oscuro', () => {
    expect(theme).toMatch(/html \{\s*color-scheme: dark;/);
  });

  it('con "reducir transparencia" las superficies de vidrio son sólidas', () => {
    expect(theme).toMatch(
      /@media \(prefers-reduced-transparency: reduce\)\s*\{\s*:root\s*\{\s*@include solid-surfaces;/,
    );
  });

  it('con "reducir movimiento" se anulan animaciones, transiciones y la transición de vista', () => {
    const reducedMotion =
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(theme)?.[1] ?? '';

    expect(reducedMotion).toMatch(/transition-duration: 0\.01ms !important;/);
    expect(reducedMotion).toMatch(/animation-duration: 0\.01ms !important;/);
    expect(reducedMotion).toMatch(/::view-transition-group\(\*\)/);
  });
});
