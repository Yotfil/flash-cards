import type { CardType } from './card.model';
import type { Rating } from './rating';

// Paquetes de práctica con IA (`/users/{uid}/practicePackages/{id}`): una rama aparte de los
// libros. Sus ítems tienen el contenido de una tarjeta pero ninguna programación: solo recuerdan
// su última calificación y el día de estudio en que se practicaron.

export type PracticePackageStatus = 'open' | 'completed';

export interface PracticeItem {
  id: string;
  cardType: CardType;
  front: string;
  back: string;
  example?: string;
  /** La última calificación (la de la última práctica, aunque sea del mismo día). */
  lastGrade?: Rating;
  /** "YYYY-MM-DD" del día de estudio de la última práctica. */
  lastPracticedDayId?: string;
  addedAt: Date;
}

/** Los ítems que tocan un día, fijados en la primera práctica de ese día. */
export interface TodaySet {
  dayId: string;
  itemIds: string[];
}

export interface PracticePackage {
  id: string;
  name: string;
  /** Fijada al crearlo: cambiar el ajuste después no la toca. */
  capacity: number;
  status: PracticePackageStatus;
  /** Por id de ítem; el orden de inserción lo da `itemOrder`. */
  items: Record<string, PracticeItem>;
  itemOrder: string[];
  todaySet?: TodaySet;
  createdAt: Date;
  completedAt?: Date;
}

/** Los ítems en el orden en que se agregaron. */
export function orderedItems(pkg: PracticePackage): PracticeItem[] {
  return pkg.itemOrder.flatMap((id) => {
    const item = pkg.items[id];
    return item ? [item] : [];
  });
}
