import { normalizeCardText } from '@services/cards/normalize-card-text';

/** Lo que separa sinónimos en un reverso: "rendirse, darse por vencido". */
const SYNONYM_SEPARATORS = /[,;/]/;

/**
 * ¿Lo escrito cuenta como acierto? Vale el reverso completo o cualquiera de sus fragmentos, con
 * la misma normalización que compara tarjetas (sin espacios de sobra, minúsculas); los acentos
 * importan ("rendí" no es "rendi"). Una entrada vacía nunca acierta.
 */
export function isWrittenAnswerCorrect(input: string, answer: string): boolean {
  const written = normalizeCardText(input);
  if (written === '') {
    return false;
  }
  return [answer, ...answer.split(SYNONYM_SEPARATORS)]
    .map(normalizeCardText)
    .some((acceptable) => acceptable !== '' && acceptable === written);
}
