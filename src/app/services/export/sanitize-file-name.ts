/** Lo que los sistemas de archivos rechazan en un nombre, más los caracteres de control. */
// eslint-disable-next-line no-control-regex -- quitar los caracteres de control es justo el propósito.
const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;
const FALLBACK_NAME = 'Libro';

/** Un nombre que cualquier sistema acepta; el nombre del libro en la app no cambia. */
export function sanitizeFileName(name: string): string {
  const safe = name.replace(FORBIDDEN, ' ').replace(/\s+/g, ' ').trim();
  return safe || FALLBACK_NAME;
}

/** "Phrasal Verbs.txt": el nombre del libro viaja en el del archivo, no dentro del texto. */
export function exportFileName(bookName: string): string {
  return `${sanitizeFileName(bookName)}.txt`;
}
