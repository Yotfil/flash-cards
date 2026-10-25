import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';

import { BatchCommitError } from '@infrastructure/firestore/batch-writer';
import {
  writeInCountedBatches,
  type CountedOperation,
} from '@infrastructure/firestore/counted-batch';

import {
  createRulesTestEnvironment,
  modularFirestore,
  ownerContext,
  seedAllowlist,
} from '../support/firestore-test-environment';

const OWNER_UID = 'u1';
const OWNER_EMAIL = 'ada@ejemplo.com';

let environment: RulesTestEnvironment;
let db: Firestore;

beforeAll(async () => {
  environment = await createRulesTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedAllowlist(environment, [OWNER_EMAIL]);
  db = modularFirestore(ownerContext(environment, OWNER_UID, OWNER_EMAIL));
  await setDoc(doc(db, 'users', OWNER_UID, 'books', 'b1'), { name: 'Libro', cardCount: 1000 });
});

const bookRef = () => doc(db, 'users', OWNER_UID, 'books', 'b1');
const cardCount = async () => (await getDoc(bookRef())).data()?.['cardCount'];
const cardRef = (uid: string, index: number) => doc(db, 'users', uid, 'cards', `k${index}`);

/** Altas: cada una suma 1 al libro. */
function sets(count: number, from = 0): CountedOperation[] {
  return Array.from({ length: count }, (_, offset) => {
    const index = from + offset;
    return {
      apply: (writer) =>
        writer.set(cardRef(OWNER_UID, index), { bookId: 'b1', front: `f${index}` }),
      delta: 1 as const,
    };
  });
}

/** Bajas: cada una resta 1 al libro. */
function deletes(
  count: number,
  uidFor: (index: number) => string = () => OWNER_UID,
): CountedOperation[] {
  return Array.from({ length: count }, (_, index) => ({
    apply: (writer) => writer.delete(cardRef(uidFor(index), index)),
    delta: -1 as const,
  }));
}

describe('writeInCountedBatches', () => {
  it('3 altas van en un lote y suman 3 al libro', async () => {
    const result = await writeInCountedBatches({
      firestore: db,
      bookRef: bookRef(),
      operations: sets(3),
    });

    expect(result.batches).toBe(1);
    expect(await cardCount()).toBe(1003);
    expect((await getDoc(cardRef(OWNER_UID, 2))).exists()).toBe(true);
  });

  it('1000 bajas van en 3 lotes y restan 1000', async () => {
    const result = await writeInCountedBatches({
      firestore: db,
      bookRef: bookRef(),
      operations: deletes(1000),
    });

    expect(result.batches).toBe(3);
    expect(await cardCount()).toBe(0);
  });

  it('sin operaciones no escribe nada', async () => {
    const result = await writeInCountedBatches({
      firestore: db,
      bookRef: bookRef(),
      operations: [],
    });

    expect(result.batches).toBe(0);
    expect(await cardCount()).toBe(1000);
  });

  it('la operación final solo va en el último lote (y sola, si no hay más)', async () => {
    const marker = doc(db, 'users', OWNER_UID, 'chapters', 'final');

    const onlyTrailing = await writeInCountedBatches({
      firestore: db,
      bookRef: bookRef(),
      operations: [],
      trailing: {
        apply: (writer) => writer.set(marker, { bookId: 'b1', name: 'Final', order: 0 }),
        delta: 0,
      },
    });
    expect(onlyTrailing.batches).toBe(1);
    expect((await getDoc(marker)).exists()).toBe(true);
    expect(await cardCount()).toBe(1000);

    const failing = await writeInCountedBatches({
      firestore: db,
      bookRef: bookRef(),
      operations: deletes(500, (index) => (index < 448 ? OWNER_UID : 'u2')),
      trailing: { apply: (writer) => writer.delete(marker), delta: 0 },
    }).catch((error: unknown) => error);
    expect(failing).toBeInstanceOf(BatchCommitError);
    expect((await getDoc(marker)).exists()).toBe(true);
  });

  it('si el segundo lote falla, el contador bajó exactamente lo del primero (448)', async () => {
    const failure = await writeInCountedBatches({
      firestore: db,
      bookRef: bookRef(),
      operations: deletes(900, (index) => (index >= 448 && index < 896 ? 'u2' : OWNER_UID)),
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(BatchCommitError);
    expect(await cardCount()).toBe(1000 - 448);
  });

  it('cada operación lleva su delta: 2 bajas y 3 altas van en un lote y suman 1', async () => {
    await setDoc(cardRef(OWNER_UID, 0), { bookId: 'b1' });
    await setDoc(cardRef(OWNER_UID, 1), { bookId: 'b1' });

    const result = await writeInCountedBatches({
      firestore: db,
      bookRef: bookRef(),
      operations: [...deletes(2), ...sets(3, 10)],
    });

    expect(result.batches).toBe(1);
    expect(await cardCount()).toBe(1001);
    expect((await getDoc(cardRef(OWNER_UID, 0))).exists()).toBe(false);
    expect((await getDoc(cardRef(OWNER_UID, 12))).exists()).toBe(true);
  });
});
