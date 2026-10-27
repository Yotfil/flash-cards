import { normalizeCardText } from '@services/cards/normalize-card-text';

/**
 * Lo que separa sinónimos en un reverso: "rendirse, darse por vencido". Con un dígito justo a cada
 * lado, el separador es parte de la respuesta (3,14 · 1/2 · 25/12): si partiera, "3" valdría por
 * "3,14". Entre letras sigue partiendo ("m/s" acepta "m": se aceptó así en la decisión 5).
 */
const SYNONYM_SEPARATORS = /(?<!\d)[,;/]|[,;/](?!\d)/;

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
