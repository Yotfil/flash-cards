import { type Card, CardState } from '@domain/models';
import { findDuplicateCardIds, normalizeText, sortCardsForDisplay } from './card-duplicates';

function buildCard(partial: Partial<Card> & Pick<Card, 'id' | 'front' | 'back'>): Card {
  return {
    bookId: 'book-1',
    chapterId: 'chapter-1',
    noteId: partial.id,
    direction: 'forward',
    suspended: false,
    createdAt: new Date('2026-06-23T00:00:00Z'),
    updatedAt: new Date('2026-06-23T00:00:00Z'),
    scheduling: {
      due: new Date(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: CardState.New,
      lastReview: null,
    },
    ...partial,
  };
}

describe('normalizeText', () => {
  it('recorta, pasa a minúsculas y colapsa espacios', () => {
    expect(normalizeText('  To   Give  Up ')).toBe('to give up');
  });
});

describe('findDuplicateCardIds', () => {
  it('marca tarjetas idénticas aunque difieran en mayúsculas/espacios', () => {
    const cards = [
      buildCard({ id: 'a', front: 'to give up', back: 'rendirse' }),
      buildCard({ id: 'b', front: 'To Give Up', back: '  rendirse ' }),
      buildCard({ id: 'c', front: 'to wake up', back: 'despertarse' }),
    ];

    const result = findDuplicateCardIds(cards);

    expect(result).toEqual(new Set(['a', 'b']));
  });

  it('NO marca si el anverso coincide pero el reverso difiere (doble traducción intencional)', () => {
    const cards = [
      buildCard({ id: 'a', front: 'get', back: 'obtener' }),
      buildCard({ id: 'b', front: 'get', back: 'llegar' }),
    ];

    expect(findDuplicateCardIds(cards)).toEqual(new Set());
  });

  it('marca los tres cuando hay tres idénticas', () => {
    const cards = [
      buildCard({ id: 'a', front: 'x', back: 'y' }),
      buildCard({ id: 'b', front: 'x', back: 'y' }),
      buildCard({ id: 'c', front: 'x', back: 'y' }),
    ];

    expect(findDuplicateCardIds(cards)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('lista sin duplicados devuelve un set vacío', () => {
    const cards = [
      buildCard({ id: 'a', front: 'uno', back: '1' }),
      buildCard({ id: 'b', front: 'dos', back: '2' }),
    ];

    expect(findDuplicateCardIds(cards)).toEqual(new Set());
  });
});

describe('sortCardsForDisplay', () => {
  it('agrupa por anverso y ordena alfabéticamente, sin mutar la entrada', () => {
    const cards = [
      buildCard({ id: 'a', front: 'banana', back: 'fruta' }),
      buildCard({ id: 'b', front: 'Apple', back: 'manzana' }),
      buildCard({ id: 'c', front: 'apple', back: 'fruta roja' }),
    ];
    const original = [...cards];

    const sorted = sortCardsForDisplay(cards);

    expect(sorted.map((card) => card.id)).toEqual(['c', 'b', 'a']);
    // 'apple' (back "fruta roja") y 'Apple' (back "manzana") quedan contiguas; 'banana' al final.
    expect(cards).toEqual(original); // no mutó la entrada
  });

  it('desempata por antigüedad cuando anverso y reverso coinciden', () => {
    const older = buildCard({
      id: 'old',
      front: 'x',
      back: 'y',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    const newer = buildCard({
      id: 'new',
      front: 'x',
      back: 'y',
      createdAt: new Date('2026-02-01T00:00:00Z'),
    });

    const sorted = sortCardsForDisplay([newer, older]);

    expect(sorted.map((card) => card.id)).toEqual(['old', 'new']);
  });
});
