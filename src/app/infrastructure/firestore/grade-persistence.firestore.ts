import { collection, doc, writeBatch, type Firestore } from 'firebase/firestore';

import type { GradeRecord } from '@domain/models/grade-record';
import { GradePersistencePort } from '@domain/ports/grade-persistence.port';

import { dailyStatsIncrements } from './daily-stats.repository.firestore';
import { reviewLogToDocument } from './schemas/review-log.schema';

// Una calificación en UN lote: la programación nueva de la tarjeta, el registro del historial y
// los incrementos del día. El SDK lo aplica a la caché local al instante y lo encola en el
// dispositivo (sobrevive a cerrar la app); `commit` se cumple cuando el servidor confirma. Si el
// servidor lo niega, no queda nada a medias: el SDK deshace el cambio local.
export class FirestoreGradePersistence extends GradePersistencePort {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  async persistGrade(uid: string, record: GradeRecord): Promise<void> {
    const batch = writeBatch(this.firestore);
    batch.update(doc(this.firestore, 'users', uid, 'cards', record.cardId), {
      scheduling: record.scheduling,
      updatedAt: new Date(),
    });
    batch.set(
      doc(collection(this.firestore, 'users', uid, 'reviewLogs')),
      reviewLogToDocument(record.log),
    );
    batch.set(
      doc(this.firestore, 'users', uid, 'dailyStats', record.dayId),
      dailyStatsIncrements(record),
      { merge: true },
    );
    await batch.commit();
  }
}
