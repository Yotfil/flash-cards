import type { PracticeItem } from '@domain/models/practice-package';
import type { Rating } from '@domain/models/rating';
import { aPackage, anItem } from '@testing/fake-practice-package-repository';

import { hardTodayIds, hasPracticedToday, pendingItemIds, todayItemIds } from './pending-items';

const TODAY = '2026-10-25';
const YESTERDAY = '2026-10-24';

const fresh = (id: string) => anItem({ id });
const practiced = (id: string, lastGrade: Rating, lastPracticedDayId = YESTERDAY): PracticeItem =>
  anItem({ id, lastGrade, lastPracticedDayId });

describe('pending-items', () => {
  it('día uno: los ítems nunca practicados están para hoy, en el orden en que se agregaron', () => {
    const pkg = aPackage({}, ['a', 'b', 'c'].map(fresh));

    expect(pendingItemIds(pkg, TODAY)).toEqual(['a', 'b', 'c']);
  });

  it('día dos: 6 nuevos + los 5 difíciles de ayer = 11; los de Bien o Fácil descansan', () => {
    const yesterday = [
      practiced('h1', 1),
      practiced('h2', 2),
      practiced('h3', 1),
      practiced('h4', 2),
      practiced('h5', 1),
      practiced('g1', 3),
      practiced('g2', 4),
      practiced('g3', 3),
    ];
    const added = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map(fresh);
    const pkg = aPackage({}, [...yesterday, ...added]);

    expect(pendingItemIds(pkg, TODAY)).toEqual([
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'n1',
      'n2',
      'n3',
      'n4',
      'n5',
      'n6',
    ]);
  });

  it('un difícil de hoy no vuelve hoy (ya se practicó); mañana sí', () => {
    const pkg = aPackage({}, [practiced('h1', 1, TODAY)]);

    expect(pendingItemIds(pkg, TODAY)).toEqual([]);
    expect(pendingItemIds(pkg, '2026-10-26')).toEqual(['h1']);
  });

  it('manda la última calificación: un 1 de la mañana corregido con Bien por la noche descansa mañana', () => {
    const pkg = aPackage({}, [practiced('x', 3, TODAY)]);

    expect(pendingItemIds(pkg, '2026-10-26')).toEqual([]);
  });

  it('con el conjunto del día ya fijado, se usa ese aunque se hayan agregado ítems después', () => {
    const pkg = aPackage({ todaySet: { dayId: TODAY, itemIds: ['a', 'b'] } }, [
      practiced('a', 1, TODAY),
      practiced('b', 4, TODAY),
      fresh('c'),
      fresh('d'),
    ]);

    expect(todayItemIds(pkg, TODAY)).toEqual(['a', 'b']);
    expect(hasPracticedToday(pkg, TODAY)).toBe(true);
  });

  it('un conjunto de otro día no cuenta: se recalcula lo pendiente', () => {
    const pkg = aPackage({ todaySet: { dayId: YESTERDAY, itemIds: ['a'] } }, [
      practiced('a', 3),
      fresh('b'),
    ]);

    expect(hasPracticedToday(pkg, TODAY)).toBe(false);
    expect(todayItemIds(pkg, TODAY)).toEqual(['b']);
  });

  it('un ítem borrado sale del conjunto del día', () => {
    const pkg = aPackage({ todaySet: { dayId: TODAY, itemIds: ['a', 'borrado'] } }, [fresh('a')]);

    expect(todayItemIds(pkg, TODAY)).toEqual(['a']);
  });

  it('los difíciles de hoy: del conjunto, los que hoy quedaron en Otra vez o Difícil', () => {
    const pkg = aPackage({ todaySet: { dayId: TODAY, itemIds: ['a', 'b', 'c', 'd'] } }, [
      practiced('a', 1, TODAY),
      practiced('b', 2, TODAY),
      practiced('c', 3, TODAY),
      fresh('d'),
      practiced('fuera', 1, TODAY),
    ]);

    expect(hardTodayIds(pkg, TODAY)).toEqual(['a', 'b']);
  });
});
