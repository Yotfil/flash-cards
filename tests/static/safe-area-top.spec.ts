import { readProjectFile } from './read-project-file';

// En la PWA del iPhone la barra de estado es translúcida (`black-translucent` + `viewport-fit=cover`):
// sin reservar la zona segura superior, el encabezado de cada pantalla queda debajo de la hora y de
// la isla de la cámara. jsdom no calcula `env()`: se afirma que los contenedores la reservan.
describe('zona segura superior', () => {
  const styles = readProjectFile('src/styles.scss');

  it('el tema define las utilidades que reservan la zona segura superior', () => {
    expect(styles).toMatch(/@utility safe-top \{\s*padding-top: env\(safe-area-inset-top\);/);
    expect(styles).toMatch(
      /@utility safe-top-gap \{\s*padding-top: calc\(env\(safe-area-inset-top\) \+ --spacing\(4\)\);/,
    );
  });

  it('el caparazón empieza debajo de la barra de estado', () => {
    const shell = readProjectFile('src/app/features/shell/shell/shell.component.html');

    expect(shell).toMatch(/^<div class="[^"]*\bsafe-top\b/);
  });

  it.each([
    'src/app/features/repaso/repaso-page/repaso-page.component.html',
    'src/app/features/practica/practica-page/practica-page.component.html',
    'src/app/features/practica-ia/practice-ai-page/practice-ai-page.component.html',
  ])('la pantalla completa %s deja la zona segura más su respiro', (path) => {
    const page = readProjectFile(path);

    expect(page).toMatch(/^<main class="[^"]*\bsafe-top-gap\b/);
    expect(page.split('\n')[0]).not.toMatch(/\bpt-4\b/);
  });
});
