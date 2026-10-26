import { readProjectFile } from './read-project-file';
import { listFiles } from './source-files';

// Un solo archivo de tema (src/styles.scss) con tokens semánticos; ningún componente escribe un
// color ni una fuente literal. Cambiar la identidad = tocar solo el archivo de tema.

const COMPONENT_SOURCES = listFiles('src/app').filter((path) => /\.(ts|html|scss)$/.test(path));

const LITERALS: { name: string; pattern: RegExp }[] = [
  { name: 'color hexadecimal', pattern: /#[0-9a-fA-F]{3,8}\b/ },
  { name: 'rgb(', pattern: /\brgba?\(/ },
  { name: 'hsl(', pattern: /\bhsla?\(/ },
  { name: 'font-family', pattern: /font-family/ },
];

// Familias de tokens que exige la spec (navegacion-y-shell, "Un solo archivo de tema").
const REQUIRED_TOKENS = [
  '--font-sans',
  '--color-night-1',
  '--color-night-2',
  '--color-night-3',
  '--color-surface',
  '--color-glass',
  '--color-glass-soft',
  '--color-glass-border',
  '--color-glass-border-soft',
  '--blur-glass',
  '--blur-glass-soft',
  '--blur-glass-nav',
  '--color-accent',
  '--color-accent-deep',
  '--color-accent-ink',
  '--color-accent-text',
  '--color-accent-tint',
  '--color-accent-line',
  '--color-text',
  '--color-text-dim',
  '--color-text-faint',
  '--color-off',
  '--color-track',
  '--color-wine',
  '--color-danger',
  '--color-danger-contrast',
  '--color-rating-again',
  '--color-rating-hard',
  '--color-rating-good',
  '--color-rating-easy',
  '--shadow-card',
  '--shadow-btn',
  '--duration-press',
  '--duration-fast',
  '--duration-base',
  '--duration-view',
  '--duration-flip',
  '--ease-out-soft',
  '--ease-in-soft',
  '--content-max-width',
];

function tokenValue(theme: string, token: string): string | undefined {
  return new RegExp(`${token}:\\s*([^;]+);`).exec(theme)?.[1]?.trim();
}

describe('tokens semánticos sin literales', () => {
  it('hay archivos de componentes que revisar', () => {
    expect(COMPONENT_SOURCES.length).toBeGreaterThan(0);
  });

  it.each(LITERALS)('ningún archivo de src/app contiene un $name', ({ pattern }) => {
    const offenders = COMPONENT_SOURCES.filter((path) => pattern.test(readProjectFile(path)));

    expect(offenders).toEqual([]);
  });

  it('el archivo de tema define todas las familias de tokens', () => {
    const theme = readProjectFile('src/styles.scss');

    const missing = REQUIRED_TOKENS.filter((token) => tokenValue(theme, token) === undefined);
    expect(missing).toEqual([]);
  });

  it('el peligro es un token propio, distinto del rojo de la calificación', () => {
    const theme = readProjectFile('src/styles.scss');

    expect(tokenValue(theme, '--color-danger')).toBeDefined();
    expect(tokenValue(theme, '--color-danger')).not.toBe(tokenValue(theme, '--color-rating-again'));
  });
});
