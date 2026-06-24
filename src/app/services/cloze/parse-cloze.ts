// Lógica PURA de tarjetas cloze ("rellenar el hueco"). Sin Angular ni Firestore: el "cerebro" que se
// prueba a fondo. La sintaxis del MVP es simple: se marca lo oculto con `{{...}}`; puede haber varios
// huecos en un texto y se ocultan TODOS juntos (un solo grupo = una tarjeta). No hay numeración
// estilo Anki (c1/c2) ni pistas: queda para una extensión futura.
//
// Lo usan: el parser de importación (detección), el formulario (validación) y el repaso (render).

/** Marcador de hueco: `{{contenido}}` con contenido no vacío (perezoso, para varios por línea). */
const CLOZE_MARKER = /\{\{(.+?)\}\}/g;

/** Texto que se muestra en lugar de un hueco oculto (Momento 1 del repaso). */
export const CLOZE_BLANK = '[…]';

/** Un trozo del texto cloze: literal (`cloze: false`) o palabra oculta (`cloze: true`). */
export interface ClozeSegment {
  text: string;
  cloze: boolean;
}

/** ¿El texto tiene al menos un hueco válido (`{{...}}` con contenido)? Define si es una tarjeta cloze. */
export function hasCloze(text: string): boolean {
  for (const match of text.matchAll(CLOZE_MARKER)) {
    if (match[1]?.trim() !== '') {
      return true;
    }
  }
  return false;
}

/**
 * Parte el texto en segmentos para pintarlo: los literales tal cual y las palabras ocultas marcadas
 * (`cloze: true`, ya recortadas). El repaso muestra un hueco por cada segmento `cloze` antes de
 * revelar, y la palabra al revelar. Los `{{}}` vacíos se tratan como texto literal, no como hueco.
 */
export function clozeSegments(text: string): ClozeSegment[] {
  const segments: ClozeSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(CLOZE_MARKER)) {
    const inner = match[1]?.trim() ?? '';
    if (inner === '') {
      continue; // `{{}}` sin contenido: no es un hueco, se deja como literal.
    }
    const start = match.index;
    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start), cloze: false });
    }
    segments.push({ text: inner, cloze: true });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), cloze: false });
  }
  return segments;
}

/** El texto con cada hueco reemplazado por `[…]` (para listados/previsualización compactos). */
export function clozeQuestion(text: string): string {
  return clozeSegments(text)
    .map((segment) => (segment.cloze ? CLOZE_BLANK : segment.text))
    .join('');
}
