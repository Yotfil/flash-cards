import { readProjectFile } from './read-project-file';

// Hosting de producción (Netlify): toda ruta profunda carga la app y toda respuesta lleva las
// cinco cabeceras de seguridad de la spec.

type TomlTable = Record<string, string | number>;

// Lector mínimo de las tablas de netlify.toml: pares `clave = "valor"` (o número) agrupados bajo
// su cabecera (`[[redirects]]`, `[headers.values]`…). Basta para afirmar valores, no formato.
function readTomlTables(text: string): { header: string; values: TomlTable }[] {
  const tables: { header: string; values: TomlTable }[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    const header = /^\[{1,2}([^\]]+)\]{1,2}$/.exec(line);
    if (header?.[1]) {
      tables.push({ header: header[1], values: {} });
      continue;
    }
    const pair = /^([\w.-]+)\s*=\s*(?:"([^"]*)"|(\d+))$/.exec(line);
    const current = tables.at(-1);
    if (pair?.[1] && current) {
      current.values[pair[1]] = pair[2] ?? Number(pair[3]);
    }
  }
  return tables;
}

describe('netlify.toml', () => {
  const tables = readTomlTables(readProjectFile('netlify.toml'));

  it('reescribe cualquier ruta a index.html con estado 200', () => {
    const redirects = tables.filter((table) => table.header === 'redirects');

    expect(redirects.map((table) => table.values)).toContainEqual({
      from: '/*',
      to: '/index.html',
      status: 200,
    });
  });

  it('entrega las cinco cabeceras de seguridad con sus valores exactos', () => {
    const headerValues = tables.find((table) => table.header === 'headers.values')?.values;

    expect(headerValues).toEqual({
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    });
  });

  it('aplica las cabeceras a todas las rutas', () => {
    const headers = tables.find((table) => table.header === 'headers');

    expect(headers?.values['for']).toBe('/*');
  });
});
