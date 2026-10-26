import { Timestamp } from 'firebase/firestore';

import { practicePackageDocumentSchema } from './practice-package.schema';

const ADDED = new Date('2026-10-20T15:00:00.000Z');
const CREATED = new Date('2026-10-19T15:00:00.000Z');

function documentWith(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Película del viernes',
    capacity: 20,
    status: 'open',
    items: {
      i1: {
        cardType: 'basic',
        front: 'to call it a day',
        back: 'dar el día por terminado',
        example: 'Let’s call it a day.',
        lastGrade: 2,
        lastPracticedDayId: '2026-10-24',
        addedAt: Timestamp.fromDate(ADDED),
      },
      i2: {
        cardType: 'cloze',
        front: 'She {{gave up}} too early',
        back: '',
        addedAt: Timestamp.fromDate(ADDED),
      },
    },
    itemOrder: ['i1', 'i2'],
    todaySet: { dayId: '2026-10-24', itemIds: ['i1'] },
    createdAt: Timestamp.fromDate(CREATED),
    ...overrides,
  };
}

describe('practicePackageDocumentSchema', () => {
  it('un paquete completo se lee con sus fechas como Date y cada ítem con su id', () => {
    const parsed = practicePackageDocumentSchema.parse(documentWith());

    expect(parsed.createdAt).toEqual(CREATED);
    expect(parsed.items['i1']).toEqual({
      id: 'i1',
      cardType: 'basic',
      front: 'to call it a day',
      back: 'dar el día por terminado',
      example: 'Let’s call it a day.',
      lastGrade: 2,
      lastPracticedDayId: '2026-10-24',
      addedAt: ADDED,
    });
    expect(parsed.items['i2']?.lastGrade).toBeUndefined();
    expect(parsed.todaySet).toEqual({ dayId: '2026-10-24', itemIds: ['i1'] });
  });

  it('sin conjunto del día ni fecha de completado también es válido', () => {
    const withoutTodaySet: Record<string, unknown> = documentWith();
    delete withoutTodaySet['todaySet'];
    const parsed = practicePackageDocumentSchema.parse(withoutTodaySet);

    expect(parsed.todaySet).toBeUndefined();
    expect(parsed.completedAt).toBeUndefined();
  });

  it('un paquete completado trae su fecha', () => {
    const completed = new Date('2026-10-25T15:00:00.000Z');
    const parsed = practicePackageDocumentSchema.parse(
      documentWith({ status: 'completed', completedAt: Timestamp.fromDate(completed) }),
    );

    expect(parsed.completedAt).toEqual(completed);
  });

  it('una entrada que el paquete no lista (resto de un ítem borrado) se aparta sin validarla', () => {
    const parsed = practicePackageDocumentSchema.parse(
      documentWith({
        items: {
          ...documentWith().items,
          gone: { lastGrade: 1, lastPracticedDayId: '2026-10-26' },
        },
      }),
    );

    expect(Object.keys(parsed.items)).toEqual(['i1', 'i2']);
    expect(parsed.strayItemIds).toEqual(['gone']);
  });

  it('sin restos, no aparta nada', () => {
    expect(practicePackageDocumentSchema.parse(documentWith()).strayItemIds).toEqual([]);
  });

  it.each([
    ['sin nombre', { name: undefined }],
    ['con un estado desconocido', { status: 'archivado' }],
    ['con capacidad no entera', { capacity: 2.5 }],
    [
      'con una calificación fuera de 1-4',
      {
        items: {
          i1: {
            cardType: 'basic',
            front: 'a',
            back: 'b',
            lastGrade: 7,
            addedAt: Timestamp.fromDate(ADDED),
          },
        },
      },
    ],
  ])('%s no es válido', (_case, overrides) => {
    expect(practicePackageDocumentSchema.safeParse(documentWith(overrides)).success).toBe(false);
  });
});
