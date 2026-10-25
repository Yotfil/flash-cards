import { exportFileName, sanitizeFileName } from './sanitize-file-name';

describe('nombre del archivo exportado', () => {
  it('quita lo que un sistema de archivos rechaza y colapsa los espacios', () => {
    expect(exportFileName('Verbos: básicos / avanzados')).toBe('Verbos básicos avanzados.txt');
  });

  it('conserva acentos y eñes', () => {
    expect(exportFileName('Ñandú en español')).toBe('Ñandú en español.txt');
  });

  it('si no queda nada, "Libro"', () => {
    expect(sanitizeFileName('  /:*?"<>|  ')).toBe('Libro');
    expect(exportFileName('???')).toBe('Libro.txt');
  });
});
