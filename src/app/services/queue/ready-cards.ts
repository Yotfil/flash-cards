import { CardState, type Card } from '@domain/models/card.model';

// La definición ÚNICA de "tarjeta lista" (puro): no suspendida y con vencimiento hasta el fin del
// día de estudio (una nueva vence al crearse). La usan la cola de Hoy, "Estudiar este libro",
// "Estudiar este capítulo" y el conteo de listas por capítulo, así hablan del mismo conjunto.

export function isReadyCard(card: Card, endOfDay: Date): boolean {
  return !card.suspended && card.scheduling.due.getTime() <= endOfDay.getTime();
}

/** Las listas en el orden de estudio: vencidas de la más atrasada a la más reciente, luego nuevas por antigüedad. */
export function orderReadyCards(cards: readonly Card[], endOfDay: Date): Card[] {
  const ready = cards.filter((card) => isReadyCard(card, endOfDay));
  const due = ready
    .filter((card) => card.scheduling.state !== CardState.New)
    .sort((a, b) => a.scheduling.due.getTime() - b.scheduling.due.getTime());
  const fresh = ready
    .filter((card) => card.scheduling.state === CardState.New)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return [...due, ...fresh];
}

/** Cuántas listas tiene cada capítulo; un capítulo sin listas no aparece. */
export function countReadyByChapter(cards: readonly Card[], endOfDay: Date): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    if (isReadyCard(card, endOfDay)) {
      counts.set(card.chapterId, (counts.get(card.chapterId) ?? 0) + 1);
    }
  }
  return counts;
}
