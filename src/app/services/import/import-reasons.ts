// Por qué se omite una línea al importar. Los produce el parser (servicios), por eso viven aquí y
// no en la copy de la pantalla; no llevan plurales.

export const REASON_NO_SEPARATOR = 'Línea sin separador ("|" o tabulador).';
export const REASON_EMPTY_SIDE = 'Anverso o reverso vacío.';
export const REASON_EMPTY_CHAPTER_NAME = 'Encabezado de capítulo sin nombre.';
export const REASON_CLOZE_WITH_SEPARATOR = 'Una línea con huecos {{…}} no lleva separador.';

export type LimitedPart = 'anverso' | 'reverso' | 'ejemplo' | 'nombre del capítulo';

/** "El anverso supera los 2000 caracteres." */
export function tooLongReason(part: LimitedPart, max: number): string {
  return `El ${part} supera los ${max} caracteres.`;
}
