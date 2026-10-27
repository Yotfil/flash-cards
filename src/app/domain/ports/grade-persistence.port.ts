import type { GradeRecord } from '../models/grade-record';

/** La tarjeta ya no existe (se borró, por ejemplo, desde otro dispositivo): no se escribió nada. */
export class CardGoneError extends Error {
  override readonly name = 'CardGoneError';

  constructor(
    readonly cardId: string,
    cause?: unknown,
  ) {
    super(`La tarjeta ${cardId} ya no existe.`, { cause });
  }
}

// Guardar una calificación: tarjeta, historial e indicadores del día en UNA operación indivisible.
// La promesa se cumple cuando el servidor confirma (o se rechaza si lo niega); la sesión no la
// espera para avanzar: el lote ya quedó guardado en el dispositivo. Dos rechazos son permanentes
// y tienen nombre: `CardGoneError` (la tarjeta se borró) y `AccessRevokedError` (sin acceso).
export abstract class GradePersistencePort {
  abstract persistGrade(uid: string, record: GradeRecord): Promise<void>;
}
