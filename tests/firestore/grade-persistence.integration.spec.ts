import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';

import { AccessRevokedError } from '@domain/models/access-revoked-error';
import { initialCardScheduling } from '@domain/models/card-scheduling';
import { CardState, type CardScheduling } from '@domain/models/card.model';
import type { GradeRecord } from '@domain/models/grade-record';
import type { Rating } from '@domain/models/rating';
import { CardGoneError } from '@domain/ports/grade-persistence.port';
import { FirestoreGradePersistence } from '@infrastructure/firestore/grade-persistence.firestore';

import {
  createRulesTestEnvironment,
  modularFirestore,
  ownerContext,
  seedAllowlist,
} from '../support/firestore-test-environment';

const OWNER_UID = 'u1';
const OWNER_EMAIL = 'ada@ejemplo.com';
const T0 = new Date('2026-10-24T15:00:00.000Z');
const DAY_ID = '2026-10-24';

let environment: RulesTestEnvironment;
let owner: Firestore;
let persistence: FirestoreGradePersistence;

beforeAll(async () => {
  environment = await createRulesTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedAllowlist(environment, [OWNER_EMAIL]);
  owner = modularFirestore(ownerContext(environment, OWNER_UID, OWNER_EMAIL));
  persistence = new FirestoreGradePersistence(owner);
  await setDoc(doc(owner, 'users', OWNER_UID, 'cards', 'k1'), {
    bookId: 'b1',
    front: 'to give up',
    scheduling: initialCardScheduling(T0),
  });
});

async function asAdmin<T>(work: (db: Firestore) => Promise<T>): Promise<T> {
  let result!: T;
  await environment.withSecurityRulesDisabled(async (context) => {
    result = await work(modularFirestore(context));
  });
  return result;
}

const read = (path: string[]) =>
  asAdmin(async (db) => (await getDoc(doc(db, 'users', OWNER_UID, ...path))).data());
const logs = () =>
  asAdmin(async (db) =>
    (await getDocs(collection(db, 'users', OWNER_UID, 'reviewLogs'))).docs.map((log) => log.data()),
  );

function aRecord(rating: Rating, before: CardState, cardId = 'k1'): GradeRecord {
  const reviewedAt = new Date(T0.getTime() + 8000);
  const scheduling: CardScheduling = {
    ...initialCardScheduling(T0),
    state: CardState.Learning,
    reps: 1,
    due: new Date(reviewedAt.getTime() + 600_000),
    lastReview: reviewedAt,
  };
  return {
    cardId,
    bookId: 'b1',
    scheduling,
    dayId: DAY_ID,
    stat: { rating, wasNew: before === CardState.New },
    log: {
      cardId,
      bookId: 'b1',
      rating,
      state: before,
      due: T0,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      lastElapsedDays: 0,
      scheduledDays: 0,
      reviewedAt,
      durationMs: 8000,
    },
  };
}

describe('FirestoreGradePersistence', () => {
  it('una nueva calificada "Bien": tarjeta, historial e indicadores del día, juntos', async () => {
    await persistence.persistGrade(OWNER_UID, aRecord(3, CardState.New));

    const card = await read(['cards', 'k1']);
    expect(card?.['scheduling']['state']).toBe(CardState.Learning);
    expect(card?.['scheduling']['lastReview'].toDate()).toEqual(new Date(T0.getTime() + 8000));
    expect(card?.['updatedAt']).toBeDefined();

    const [log] = await logs();
    expect(log?.['rating']).toBe(3);
    expect(log?.['state']).toBe(CardState.New);
    expect(log?.['reviewedAt'].toDate()).toEqual(new Date(T0.getTime() + 8000));
    expect(log?.['durationMs']).toBe(8000);

    const day = await read(['dailyStats', DAY_ID]);
    expect(day).toEqual({
      date: DAY_ID,
      reviewsCompleted: 1,
      ratingCounts: { good: 1 },
      newCardsIntroduced: { b1: 1 },
    });
  });

  it('una que no era nueva cuenta para el tope de repasos del libro', async () => {
    await persistence.persistGrade(OWNER_UID, aRecord(2, CardState.Review));

    const day = await read(['dailyStats', DAY_ID]);
    expect(day?.['reviewsCompletedByBook']).toEqual({ b1: 1 });
    expect(day?.['ratingCounts']).toEqual({ hard: 1 });
    expect(day?.['newCardsIntroduced']).toBeUndefined();
  });

  it('dos calificaciones el mismo día se suman', async () => {
    await persistence.persistGrade(OWNER_UID, aRecord(3, CardState.New));
    await persistence.persistGrade(OWNER_UID, aRecord(4, CardState.Learning));

    const day = await read(['dailyStats', DAY_ID]);
    expect(day?.['reviewsCompleted']).toBe(2);
    expect(day?.['ratingCounts']).toEqual({ good: 1, easy: 1 });
  });

  it('si una parte no se puede escribir, no se escribe ninguna', async () => {
    // Un id con barras cae fuera de las reglas (`cards/{cardId}` es un solo segmento).
    const failure = await persistence
      .persistGrade(OWNER_UID, aRecord(3, CardState.New, 'fuera/de/reglas'))
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect(await logs()).toEqual([]);
    expect(await read(['dailyStats', DAY_ID])).toBeUndefined();
  });

  it('una tarjeta que se borró en otro dispositivo se rechaza con "la tarjeta ya no existe"', async () => {
    await asAdmin((db) => deleteDoc(doc(db, 'users', OWNER_UID, 'cards', 'k1')));

    const failure = await persistence
      .persistGrade(OWNER_UID, aRecord(3, CardState.New))
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(CardGoneError);
    expect((failure as CardGoneError).cardId).toBe('k1');
    expect(await logs()).toEqual([]);
    expect(await read(['dailyStats', DAY_ID])).toBeUndefined();
  });

  it('sin acceso (el correo salió de la lista) se rechaza con "acceso retirado"', async () => {
    await asAdmin((db) => deleteDoc(doc(db, 'allowlist', OWNER_EMAIL)));

    const failure = await persistence
      .persistGrade(OWNER_UID, aRecord(3, CardState.New))
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AccessRevokedError);
    expect(await logs()).toEqual([]);
  });

  it('el registro del historial no se puede editar ni borrar', async () => {
    await persistence.persistGrade(OWNER_UID, aRecord(3, CardState.New));
    const logId =
      (await asAdmin(async (db) => getDocs(collection(db, 'users', OWNER_UID, 'reviewLogs'))))
        .docs[0]?.id ?? '';
    const ref = doc(owner, 'users', OWNER_UID, 'reviewLogs', logId);

    await expect(updateDoc(ref, { rating: 4 })).rejects.toThrow();
    await expect(deleteDoc(ref)).rejects.toThrow();
  });
});
