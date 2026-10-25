// Tarjetas cloze ("rellenar el hueco"): el texto marca lo que se oculta con `{{…}}`. Un marcador
// vacío (`{{}}` o solo espacios) no es un hueco: se queda como texto literal.

/** Lo que se pinta en lugar de cada hueco mientras está oculto. */
export const CLOZE_BLANK = '[…]';

export type ClozeSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'hidden'; readonly text: string };

const CLOZE_MARKER = /\{\{([^{}]*)\}\}/g;

/** El texto partido en literales y huecos (el contenido de cada hueco, recortado). */
export function clozeSegments(text: string): ClozeSegment[] {
  const segments: ClozeSegment[] = [];
  let consumed = 0;
  for (const match of text.matchAll(CLOZE_MARKER)) {
    const content = (match[1] ?? '').trim();
    if (content === '') {
      continue;
    }
    pushLiteral(segments, text.slice(consumed, match.index));
    segments.push({ kind: 'hidden', text: content });
    consumed = match.index + match[0].length;
  }
  pushLiteral(segments, text.slice(consumed));
  return segments;
}

/** ¿Tiene al menos un hueco de verdad? */
export function hasCloze(text: string): boolean {
  return clozeSegments(text).some((segment) => segment.kind === 'hidden');
}

/** La pregunta tal como se ve antes de revelar: cada hueco como `[…]`. */
export function clozeQuestion(text: string): string {
  return clozeSegments(text)
    .map((segment) => (segment.kind === 'hidden' ? CLOZE_BLANK : segment.text))
    .join('');
}

function pushLiteral(segments: ClozeSegment[], text: string): void {
  if (text !== '') {
    segments.push({ kind: 'text', text });
  }
}
