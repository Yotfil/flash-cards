// Comparación tolerante de la respuesta escrita en un quiz. Pura y testeable. La práctica es una
// modalidad distinta al repaso FSRS; aquí sólo se decide si lo tecleado cuenta como acierto.

/** Normaliza para comparar: recorta, pasa a minúsculas y colapsa espacios. Conserva los acentos
 *  (en idiomas importan: "rendir" ≠ "rendí"). */
export function normalizeAnswer(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * ¿La respuesta escrita cuenta como correcta? Acepta el reverso completo o cualquiera de sus partes
 * separadas por `,`, `;` o `/` (un reverso como "rendirse, darse por vencido" admite teclear sólo
 * "rendirse"). Comparación normalizada; una entrada vacía nunca acierta.
 */
export function isWrittenAnswerCorrect(input: string, answer: string): boolean {
  const normalizedInput = normalizeAnswer(input);
  if (normalizedInput === '') {
    return false;
  }
  const acceptable = [answer, ...answer.split(/[,;/]/)]
    .map(normalizeAnswer)
    .filter((value) => value !== '');
  return acceptable.includes(normalizedInput);
}
