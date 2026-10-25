import { CardState, type Card } from '@domain/models/card.model';
import { aCard } from '@testing/fake-card-repository';

import { countReadyByChapter, isReadyCard, orderReadyCards } from './ready-cards';

const END_OF_DAY = new Date('2026-10-25T09:00:00Z');
const DAY_MS = 86_400_000;
const daysBeforeEnd = (days: number) => new Date(END_OF_DAY.getTime() - days * DAY_MS);

function due(id: string, dueAt: Date, overrides: Partial<Card> = {}): Card {
  const base = aCard({ id });
  return {
    ...base,
    ...overrides,
    scheduling: { ...base.scheduling, state: CardState.Review, due: dueAt },
  };
}

function fresh(id: string, createdAt: Date, overrides: Partial<Card> = {}): Card {
  const base = aCard({ id, createdAt });
  return {
    ...base,
    ...overrides,
    scheduling: { ...base.scheduling, state: CardState.New, due: createdAt },
  };
}

describe('isReadyCard', () => {
  it('lista = no suspendida y vence hasta el fin del día de estudio', () => {
    expect(isReadyCard(due('a', daysBeforeEnd(1)), END_OF_DAY)).toBe(true);
    expect(isReadyCard(due('b', END_OF_DAY), END_OF_DAY)).toBe(true);
    expect(isReadyCard(fresh('c', daysBeforeEnd(5)), END_OF_DAY)).toBe(true);
  });

  it('una suspendida o una que vence después no está lista', () => {
    expect(isReadyCard(due('a', daysBeforeEnd(1), { suspended: true }), END_OF_DAY)).toBe(false);
    expect(isReadyCard(due('b', new Date(END_OF_DAY.getTime() + 1)), END_OF_DAY)).toBe(false);
  });
});

describe('orderReadyCards', () => {
  it('vencidas de la más atrasada a la más reciente, después nuevas por antigüedad', () => {
    const cards = [
      fresh('nueva-reciente', daysBeforeEnd(1)),
      due('hoy', daysBeforeEnd(0.2)),
      due('mañana', new Date(END_OF_DAY.getTime() + DAY_MS)),
      due('hace-3-días', daysBeforeEnd(3)),
      due('suspendida', daysBeforeEnd(4), { suspended: true }),
      fresh('nueva-antigua', daysBeforeEnd(9)),
      due('ayer', daysBeforeEnd(1)),
    ];

    expect(orderReadyCards(cards, END_OF_DAY).map((card) => card.id)).toEqual([
      'hace-3-días',
      'ayer',
      'hoy',
      'nueva-antigua',
      'nueva-reciente',
    ]);
  });
});

describe('countReadyByChapter', () => {
  it('cuenta las listas de cada capítulo; uno sin listas no aparece', () => {
    const cards = [
      ...Array.from({ length: 22 }, (_, index) =>
        due(`a${index}`, daysBeforeEnd(1), { chapterId: 'c1' }),
      ),
      ...Array.from({ length: 63 }, (_, index) =>
        fresh(`b${index}`, daysBeforeEnd(2), { chapterId: 'c2' }),
      ),
      due('futura', new Date(END_OF_DAY.getTime() + DAY_MS), { chapterId: 'c3' }),
    ];

    const counts = countReadyByChapter(cards, END_OF_DAY);

    expect(counts.get('c1')).toBe(22);
    expect(counts.get('c2')).toBe(63);
    expect(counts.has('c3')).toBe(false);
  });
});
