import {
  collection,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';

import { ratingCountKey, type DailyStats } from '@domain/models/daily-stats.model';
import type { GradeRecord } from '@domain/models/grade-record';
import { DailyStatsRepository } from '@domain/ports/daily-stats.repository';
import type { ReadSource } from '@domain/ports/read-source';

import { parseDocuments } from './document-boundary';
import { readFrom } from './read-from';
import { dailyStatsDocumentSchema } from './schemas/daily-stats.schema';

// Indicadores diarios en `users/{uid}/dailyStats/{YYYY-MM-DD}`, lado de lectura. Los recientes se
// ordenan por `date` (un solo campo: Firestore lo indexa solo), que siempre vale lo mismo que el id.
export class FirestoreDailyStatsRepository extends DailyStatsRepository {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  // Una consulta y no `getDoc`: sin red, `getDoc` de un documento que nunca pasó por la caché (el
  // de un día nuevo, sin actividad todavía) lanza "client is offline", y Hoy caería en error justo
  // al empezar el día. La consulta responde con lo que haya en la caché: vacío = sin actividad.
  async getByDay(
    uid: string,
    dayId: string,
    source: ReadSource = 'server',
  ): Promise<DailyStats | null> {
    const snapshot = await readFrom(
      query(this.daysOf(uid), where('date', '==', dayId), limit(1)),
      source,
    );
    return parseDocuments(dailyStatsDocumentSchema, snapshot.docs)[0] ?? null;
  }

  async listRecent(uid: string, count: number): Promise<DailyStats[]> {
    const snapshot = await getDocs(query(this.daysOf(uid), orderBy('date', 'desc'), limit(count)));
    return parseDocuments(dailyStatsDocumentSchema, snapshot.docs);
  }

  private daysOf(uid: string) {
    return collection(this.firestore, 'users', uid, 'dailyStats');
  }
}

/**
 * Lo que una calificación suma al documento de su día (para `set(..., { merge: true })`): ÚNICA
 * definición de esos incrementos. Una nueva introducida cuenta para la tanda de nuevas del libro;
 * una que no lo era, para su tope de repasos. Nadie escribe indicadores fuera del lote atómico de
 * la calificación.
 */
export function dailyStatsIncrements(
  record: Pick<GradeRecord, 'dayId' | 'bookId' | 'stat'>,
): Record<string, unknown> {
  const perBook = { [record.bookId]: increment(1) };
  return {
    date: record.dayId,
    reviewsCompleted: increment(1),
    ratingCounts: { [ratingCountKey(record.stat.rating)]: increment(1) },
    ...(record.stat.wasNew ? { newCardsIntroduced: perBook } : { reviewsCompletedByBook: perBook }),
  };
}
