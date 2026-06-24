// Adaptador Firestore del puerto DailyStatsRepository. Actualiza el contador del día
// `users/{uid}/dailyStats/{YYYY-MM-DD}` con incrementos atómicos (setDoc + merge), creándolo si no
// existe. Los conteos se acumulan de forma dispersa (sólo las claves tocadas); el lector de
// estadísticas (futuro) debe tratar las ausentes como 0.

import { Injectable, inject } from '@angular/core';
import { doc, getDoc, increment, setDoc } from 'firebase/firestore';

import { DailyStatsRepository, type ReviewStatInput } from '@domain/ports';
import type { DailyStats, Rating } from '@domain/models';
import { FIRESTORE } from '@infrastructure/firebase';
import { dailyStatsDocumentSchema } from './schemas/daily-stats.schema';

const USERS_COLLECTION = 'users';
const DAILY_STATS_COLLECTION = 'dailyStats';

const RATING_NAME: Record<Rating, 'again' | 'hard' | 'good' | 'easy'> = {
  1: 'again',
  2: 'hard',
  3: 'good',
  4: 'easy',
};

@Injectable()
export class FirestoreDailyStatsRepository extends DailyStatsRepository {
  private readonly firestore = inject(FIRESTORE);

  override async recordReview(uid: string, dateId: string, input: ReviewStatInput): Promise<void> {
    const reference = doc(this.firestore, USERS_COLLECTION, uid, DAILY_STATS_COLLECTION, dateId);

    const data: Record<string, unknown> = {
      date: dateId,
      reviewsCompleted: increment(1),
      ratingCounts: { [RATING_NAME[input.rating]]: increment(1) },
    };
    if (input.wasNew) {
      data['newCardsIntroduced'] = { [input.bookId]: increment(1) };
    }

    await setDoc(reference, data, { merge: true });
  }

  override async getToday(uid: string, dateId: string): Promise<DailyStats | null> {
    const snapshot = await getDoc(
      doc(this.firestore, USERS_COLLECTION, uid, DAILY_STATS_COLLECTION, dateId),
    );
    if (!snapshot.exists()) {
      return null;
    }
    // Frontera: dato externo; los conteos dispersos se completan a 0 (schema con defaults).
    const data = dailyStatsDocumentSchema.parse(snapshot.data());
    return { id: dateId, ...data };
  }
}
