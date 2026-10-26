import type { CardContentDraft } from '../models/card.model';
import type { PracticeItem, PracticePackage, TodaySet } from '../models/practice-package';
import type { Rating } from '../models/rating';

/** Ya no cabe lo que se quería agregar: no se escribió nada. */
export class PackageFullError extends Error {
  override readonly name = 'PackageFullError';

  constructor(readonly capacity: number) {
    super(`El paquete no admite más de ${capacity} ítems.`);
  }
}

/** El paquete ya no existe (se borró, por ejemplo, desde otro dispositivo): no se escribió nada. */
export class PracticePackageGoneError extends Error {
  override readonly name = 'PracticePackageGoneError';

  constructor(readonly packageId: string) {
    super(`El paquete ${packageId} ya no existe.`);
  }
}

/** El paquete existe pero ya no tiene ese ítem (se borró desde otro dispositivo): no se escribió nada. */
export class PracticeItemGoneError extends Error {
  override readonly name = 'PracticeItemGoneError';

  constructor(readonly itemId: string) {
    super(`El ítem ${itemId} ya no está en el paquete.`);
  }
}

// Paquetes de práctica del usuario en el almacén: un documento por paquete, con sus ítems dentro.
// Ninguna operación toca libros, tarjetas, historial ni indicadores del día.
export abstract class PracticePackageRepository {
  /** Todos los paquetes, por fecha de creación. Lanza si un documento no es válido. */
  abstract listByUser(uid: string): Promise<PracticePackage[]>;
  abstract create(uid: string, input: { name: string; capacity: number }): Promise<PracticePackage>;
  abstract rename(uid: string, packageId: string, name: string): Promise<void>;
  abstract delete(uid: string, packageId: string): Promise<void>;
  /** Agrega al final; si no caben todos, lanza `PackageFullError` sin escribir nada. */
  abstract addItems(
    uid: string,
    packageId: string,
    drafts: readonly CardContentDraft[],
  ): Promise<PracticeItem[]>;
  /**
   * Cambia el contenido; conserva la última calificación. Si el paquete o el ítem ya no existen,
   * lanza `PracticePackageGoneError` o `PracticeItemGoneError` sin escribir nada.
   */
  abstract updateItem(
    uid: string,
    packageId: string,
    itemId: string,
    draft: CardContentDraft,
  ): Promise<void>;
  abstract removeItem(uid: string, packageId: string, itemId: string): Promise<void>;
  abstract fixTodaySet(uid: string, packageId: string, todaySet: TodaySet): Promise<void>;
  /** Solo la última calificación y su día, sin tocar el resto del paquete. */
  abstract recordGrade(
    uid: string,
    packageId: string,
    itemId: string,
    grade: { grade: Rating; dayId: string },
  ): Promise<void>;
  abstract complete(uid: string, packageId: string, completedAt: Date): Promise<void>;
}
