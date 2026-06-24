// Adaptador Firestore del puerto ReviewLogRepository. Añade registros a `users/{uid}/reviewLogs`
// (append-only). Convierte las fechas del dominio a Timestamp.

import { Injectable, inject } from '@angular/core';
import { Timestamp, addDoc, collection } from 'firebase/firestore';

import { ReviewLogRepository, type ReviewLogInput } from '@domain/ports';
import { FIRESTORE } from '@infrastructure/firebase';

const USERS_COLLECTION = 'users';
const REVIEW_LOGS_COLLECTION = 'reviewLogs';

@Injectable()
export class FirestoreReviewLogRepository extends ReviewLogRepository {
  private readonly firestore = inject(FIRESTORE);

  override async append(uid: string, log: ReviewLogInput): Promise<void> {
    const document: Record<string, unknown> = {
      cardId: log.cardId,
      bookId: log.bookId,
      rating: log.rating,
      state: log.state,
      due: Timestamp.fromDate(log.due),
      stability: log.stability,
      difficulty: log.difficulty,
      elapsedDays: log.elapsedDays,
      lastElapsedDays: log.lastElapsedDays,
      scheduledDays: log.scheduledDays,
      reviewedAt: Timestamp.fromDate(log.reviewedAt),
    };
    if (log.durationMs !== undefined) {
      document['durationMs'] = log.durationMs;
    }
    await addDoc(
      collection(this.firestore, USERS_COLLECTION, uid, REVIEW_LOGS_COLLECTION),
      document,
    );
  }
}
