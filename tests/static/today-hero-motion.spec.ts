import { readProjectFile } from './read-project-file';

// La luz que recorre el borde del bloque principal de Hoy usa el token de su duración y se queda
// quieta con "reducir movimiento". jsdom no aplica media queries: se afirma que el estilo lo declara.
describe('movimiento del bloque principal de Hoy', () => {
  const styles = readProjectFile('src/app/features/hoy/today-hero/today-hero.component.scss');

  it('la luz gira con el token --duration-orbit', () => {
    expect(styles).toMatch(/var\(--duration-orbit\)/);
  });

  it('con "reducir movimiento" la luz se apaga', () => {
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
