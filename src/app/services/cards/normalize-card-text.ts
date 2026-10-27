/** Apóstrofos tipográficos (’ ‘ ʼ) y comillas tipográficas (“ ”), que se comparan como los rectos. */
const TYPOGRAPHIC_APOSTROPHES = /[’‘ʼ]/g;
const TYPOGRAPHIC_QUOTES = /[“”]/g;

/**
 * Forma comparable de un texto de tarjeta: sin espacios de sobra, en minúsculas, con los
 * apóstrofos y las comillas rectos y cada letra con tilde de una sola pieza (NFC). Así lo que se
 * lee igual se compara igual aunque venga de Word, de un PDF o del teclado del iPhone. Solo sirve
 * para comparar y ordenar: el texto guardado y el que se muestra no pasan por aquí.
 */
export function normalizeCardText(text: string): string {
  return text
    .normalize('NFC')
    .replace(TYPOGRAPHIC_APOSTROPHES, "'")
    .replace(TYPOGRAPHIC_QUOTES, '"')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
