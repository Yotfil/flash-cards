import { readProjectFile } from './read-project-file';

// La luz que recorre el borde del bloque principal de Hoy usa el token de su duración y se queda
// quieta con "reducir movimiento". jsdom no aplica media queries: se afirma que el estilo lo declara.
describe('movimiento del bloque principal de Hoy', () => {
  const styles = readProjectFile('src/app/features/hoy/today-hero/today-hero.component.scss');

  it('la luz gira con el token --duration-orbit', () => {
    expect(styles).toMatch(/var\(--duration-orbit\)/);
  });

  // Girar una capa rectangular no sirve: en un bloque ancho, al girar deja partes del borde sin
  // cubrir y la luz sale partida en dos o desaparece. Lo que gira es el ángulo del degradado.
  it('la luz anima el ángulo del degradado, no gira una capa', () => {
    expect(styles).toMatch(/@property --hero-light-angle/);
    expect(styles).toMatch(/conic-gradient\(\s*from var\(--hero-light-angle\)/);
    expect(styles).not.toMatch(/rotate\(/);
  });

  it('con "reducir movimiento" la luz se apaga', () => {
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
