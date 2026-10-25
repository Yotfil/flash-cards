import type { GradeRecord } from '../models/grade-record';

// Guardar una calificación: tarjeta, historial e indicadores del día en UNA operación indivisible.
// La promesa se cumple cuando el servidor confirma (o se rechaza si lo niega); la sesión no la
// espera para avanzar: el lote ya quedó guardado en el dispositivo.
export abstract class GradePersistencePort {
  abstract persistGrade(uid: string, record: GradeRecord): Promise<void>;
}
