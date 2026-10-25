import { PIPE, TAB } from './import-grammar';

/**
 * El primer " :: " (sobre la línea ya recortada, así que al final basta el espacio de delante).
 * Un "::" pegado a texto por cualquier lado es contenido (`std::vector`).
 */
const EXAMPLE_MARK = / ::(?: |$)/;

/** Aparta el ejemplo opcional de una línea de tarjeta ya recortada. Vacío = sin ejemplo. */
export function splitExample(line: string): { body: string; example?: string } {
  const match = EXAMPLE_MARK.exec(line);
  if (!match) {
    return { body: line };
  }
  const body = line.slice(0, match.index).trim();
  const example = line.slice(match.index + match[0].length).trim();
  return example ? { body, example } : { body };
}

/** Parte por el primer `|` (o, si no hay ninguno, por el primer tabulador) y recorta los lados. */
export function splitBasicCard(body: string): { front: string; back: string } | null {
  const separator = body.includes(PIPE) ? PIPE : body.includes(TAB) ? TAB : null;
  if (separator === null) {
    return null;
  }
  const at = body.indexOf(separator);
  return { front: body.slice(0, at).trim(), back: body.slice(at + separator.length).trim() };
}
