// Adaptador Firestore del puerto GradePersistencePort. Escribe los tres documentos de una
// calificación (scheduling de la tarjeta, registro de reviewLogs y contadores de dailyStats) en UN
// solo writeBatch: o quedan los tres o no queda ninguno. Reusa los mapeos de los repositorios para
// que el formato de cada documento siga teniendo una única definición.

import { Injectable, inject } from '@angular/core';
import { Timestamp, collection, doc, writeBatch } from 'firebase/firestore';

import { GradePersistencePort, type GradePersistenceInput } from '@domain/ports';
import { FIRESTORE } from '@infrastructure/firebase';
import { schedulingToFirestore } from './card-document.mapper';
import { reviewStatToFirestoreUpdate } from './daily-stats.repository.firestore';
import { reviewLogToFirestoreDocument } from './review-log.repository.firestore';

const USERS_COLLECTION = 'users';
const CARDS_COLLECTION = 'cards';
const REVIEW_LOGS_COLLECTION = 'reviewLogs';
const DAILY_STATS_COLLECTION = 'dailyStats';

@Injectable()
export class FirestoreGradePersistence extends GradePersistencePort {
  private readonly firestore = inject(FIRESTORE);

  override async persistGrade(uid: string, input: GradePersistenceInput): Promise<void> {
    const batch = writeBatch(this.firestore);

    const cardRef = doc(this.firestore, USERS_COLLECTION, uid, CARDS_COLLECTION, input.cardId);
    batch.update(cardRef, {
      scheduling: schedulingToFirestore(input.scheduling),
      updatedAt: Timestamp.fromDate(new Date()),
    });

    // Documento nuevo con id generado por el cliente (equivalente a addDoc, pero dentro del batch).
    const logRef = doc(collection(this.firestore, USERS_COLLECTION, uid, REVIEW_LOGS_COLLECTION));
    batch.set(logRef, reviewLogToFirestoreDocument(input.log));

    const statsRef = doc(
      this.firestore,
      USERS_COLLECTION,
      uid,
      DAILY_STATS_COLLECTION,
      input.dateId,
    );
    batch.set(statsRef, reviewStatToFirestoreUpdate(input.dateId, input.stat), { merge: true });

    await batch.commit();
  }
}
