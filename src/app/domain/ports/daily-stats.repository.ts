import type { DailyStats } from '../models/daily-stats.model';

// Indicadores diarios del usuario, lado de lectura. La escritura (acreditar un repaso) la añade la
// sesión de repaso a este mismo puerto.
export abstract class DailyStatsRepository {
  /** Los indicadores de un día de estudio, o `null` si ese día no hubo actividad. */
  abstract getByDay(uid: string, dayId: string): Promise<DailyStats | null>;
  /** Los `limit` días más recientes con indicadores, del más nuevo al más viejo. */
  abstract listRecent(uid: string, limit: number): Promise<DailyStats[]>;
}
