import { readProjectFile } from './read-project-file';

// La sesión de repaso anima (volteo, cascada, cierre) y respeta "reducir movimiento"; las pistas
// de teclado se ocultan en pantallas táctiles. jsdom no aplica media queries: se afirma que cada
// estilo lo declara; el efecto se revisa a mano.
const styles = (component: string) =>
  readProjectFile(`src/app/features/repaso/${component}/${component}.component.scss`);

describe('estilos de la sesión de repaso', () => {
  it('la fila de cerebros oculta las pistas sin puntero fino y respeta reducir movimiento', () => {
    expect(styles('rating-bar')).toMatch(/@media \(hover: none\)/);
    expect(styles('rating-bar')).toMatch(/prefers-reduced-motion/);
  });

  it('la tarjeta voltea con su token y se queda quieta con reducir movimiento', () => {
    expect(styles('flip-card')).toMatch(/var\(--duration-flip\)/);
    expect(styles('flip-card')).toMatch(/prefers-reduced-motion/);
  });

  it('el cierre anima el anillo y la marca con sus tokens, y respeta reducir movimiento', () => {
    expect(styles('session-summary')).toMatch(/var\(--duration-ring\)/);
    expect(styles('session-summary')).toMatch(/var\(--duration-check\)/);
    expect(styles('session-summary')).toMatch(/prefers-reduced-motion/);
  });
});
