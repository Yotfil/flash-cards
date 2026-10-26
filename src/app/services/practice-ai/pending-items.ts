import type { PracticePackage } from '@domain/models/practice-package';

/** "Otra vez" o "Difícil": lo que vuelve al día siguiente. */
const HARD_GRADE = 2;

/**
 * Lo pendiente de un día, en el orden en que se agregaron: los ítems nunca practicados y los que
 * en su última práctica, en un día anterior, salieron "Otra vez" o "Difícil". Los de "Bien" o
 * "Fácil" descansan. Los ids de día (`YYYY-MM-DD`) se comparan como texto.
 */
export function pendingItemIds(pkg: PracticePackage, dayId: string): string[] {
  return pkg.itemOrder.filter((id) => {
    const item = pkg.items[id];
    if (!item) {
      return false;
    }
    if (!item.lastPracticedDayId) {
      return true;
    }
    return (item.lastGrade ?? 0) <= HARD_GRADE && item.lastPracticedDayId < dayId;
  });
}

/** ¿Ya se practicó este día? (el conjunto se fija en la primera práctica). */
export function hasPracticedToday(pkg: PracticePackage, dayId: string): boolean {
  return pkg.todaySet?.dayId === dayId;
}

/** Los ítems del día: el conjunto fijado si ya se practicó (sin los borrados), si no lo pendiente. */
export function todayItemIds(pkg: PracticePackage, dayId: string): string[] {
  if (pkg.todaySet && hasPracticedToday(pkg, dayId)) {
    return pkg.todaySet.itemIds.filter((id) => id in pkg.items);
  }
  return pendingItemIds(pkg, dayId);
}

/** Del conjunto del día, los que hoy quedaron en "Otra vez" o "Difícil" (manda la última). */
export function hardTodayIds(pkg: PracticePackage, dayId: string): string[] {
  return todayItemIds(pkg, dayId).filter((id) => {
    const item = pkg.items[id];
    return item?.lastPracticedDayId === dayId && (item.lastGrade ?? 0) <= HARD_GRADE;
  });
}
