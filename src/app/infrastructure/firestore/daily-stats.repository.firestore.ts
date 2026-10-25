import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  type Firestore,
} from 'firebase/firestore';

import { ratingCountKey, type DailyStats } from '@domain/models/daily-stats.model';
import type { GradeRecord } from '@domain/models/grade-record';
import { DailyStatsRepository } from '@domain/ports/daily-stats.repository';

import { parseDocument, parseDocuments } from './document-boundary';
import { dailyStatsDocumentSchema } from './schemas/daily-stats.schema';

// Indicadores diarios en `users/{uid}/dailyStats/{YYYY-MM-DD}`, lado de lectura. Los recientes se
// ordenan por `date` (un solo campo: Firestore lo indexa solo), que siempre vale lo mismo que el id.
export class FirestoreDailyStatsRepository extends DailyStatsRepository {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  async getByDay(uid: string, dayId: string): Promise<DailyStats | null> {
    const snapshot = await getDoc(doc(this.daysOf(uid), dayId));
    if (!snapshot.exists()) {
      return null;
    }
    return {
      id: snapshot.id,
      ...parseDocument(dailyStatsDocumentSchema, snapshot.ref.path, snapshot.data()),
    };
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
