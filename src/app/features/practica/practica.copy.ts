// Textos de la práctica, centralizados (ADR 0002: copy por feature). Voz cálida, breve, serena.
export const PRACTICA_COPY = {
  practice: 'Practicar',
  nothingToPractice: 'Nada que practicar aún.',
  prepareError: 'No se pudo preparar la práctica. Inténtalo de nuevo.',
  chooseAnswer: 'Elige la respuesta',
  writeAnswer: 'Escribe la respuesta',
  answerLabel: 'Tu respuesta',
  check: 'Comprobar',
  correct: '¡Correcto!',
  next: 'Siguiente',
  seeResult: 'Ver resultado',
  completedTitle: '¡Práctica completada!',
} as const;

/** "4 / 10": la pregunta actual sobre el total, en la barra superior. */
export function positionLabel(position: number, total: number): string {
  return `${position} / ${total}`;
}

export function scoreLabel(score: number, total: number): string {
  return `Acertaste ${score} de ${total}.`;
}

export function wrongAnswerLabel(answer: string): string {
  return `La respuesta era «${answer}».`;
}

/** El botón del resumen vuelve al origen de la práctica. */
export function backLabel(origin: 'chapter' | 'book'): string {
  return origin === 'chapter' ? 'Volver al capítulo' : 'Volver al libro';
}
