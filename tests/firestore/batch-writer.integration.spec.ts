import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

import {
  BatchCommitError,
  BatchWriter,
  MAX_BATCH_SIZE,
} from '@infrastructure/firestore/batch-writer';
import {
  createRulesTestEnvironment,
  modularFirestore,
  ownerContext,
  seedAllowlist,
} from '../support/firestore-test-environment';

// El escritor por lotes contra el emulador y las reglas reales: trocea en lotes de hasta 450,
// confirma en orden y, si un lote falla, informa qué quedó escrito antes.

const OWNER_UID = 'u1';
const OWNER_EMAIL = 'ana@example.com';

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
});

function cardRef(uid: string, index: number) {
  return doc(db, 'users', uid, 'cards', `c${index}`);
}

async function countCards(uid: string): Promise<number> {
  const snapshot = await getCountFromServer(collection(db, 'users', uid, 'cards'));
  return snapshot.data().count;
}

describe('BatchWriter', () => {
  it('trocea con margen bajo el límite de 500 del almacén', () => {
    expect(MAX_BATCH_SIZE).toBe(450);
  });

  it('306 escrituras caben en un único lote', async () => {
    const writer = new BatchWriter(db);
    for (let index = 0; index < 306; index++) {
      writer.set(cardRef(OWNER_UID, index), { front: `anverso ${index}`, back: 'reverso' });
    }

    const result = await writer.commit();

    expect(result.batches).toBe(1);
    expect(result.written).toHaveLength(306);
    expect(await countCards(OWNER_UID)).toBe(306);
  });

  it('1 000 escrituras se reparten en tres lotes y respetan el orden en que se añadieron', async () => {
    const writer = new BatchWriter(db);
    for (let index = 0; index < 1000; index++) {
      writer.set(cardRef(OWNER_UID, index), { front: `anverso ${index}`, back: 'reverso' });
    }

    const result = await writer.commit();

    expect(result.batches).toBe(3);
    expect(result.written.at(-1)?.path).toBe('users/u1/cards/c999');
    expect(result.written[0]?.path).toBe('users/u1/cards/c0');
    expect(await countCards(OWNER_UID)).toBe(1000);
  });

  it('si el segundo lote falla, informa lo confirmado en el primero y conserva el error', async () => {
    const writer = new BatchWriter(db);
    for (let index = 0; index < 450; index++) {
      writer.set(cardRef(OWNER_UID, index), { front: `anverso ${index}`, back: 'reverso' });
    }
    // Las últimas 150 apuntan al árbol de otro usuario: las reglas rechazan ese lote entero.
    for (let index = 450; index < 600; index++) {
      writer.set(cardRef('u2', index), { front: `anverso ${index}`, back: 'reverso' });
    }

    const failure = await writer.commit().then(
      () => null,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(BatchCommitError);
    const commitError = failure as BatchCommitError;
    expect(commitError.committed).toHaveLength(450);
    expect(commitError.cause).toBeDefined();
    expect(await countCards(OWNER_UID)).toBe(450);
    expect((await getDoc(cardRef(OWNER_UID, 449))).exists()).toBe(true);
  });

  it('900 borrados se ejecutan en dos lotes y vacían la colección', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const seedDb = modularFirestore(context);
      for (let start = 0; start < 900; start += MAX_BATCH_SIZE) {
        const batch = writeBatch(seedDb);
        for (let index = start; index < Math.min(start + MAX_BATCH_SIZE, 900); index++) {
          batch.set(doc(seedDb, 'users', OWNER_UID, 'cards', `c${index}`), { front: 'f' });
        }
        await batch.commit();
      }
    });
    const writer = new BatchWriter(db);
    for (let index = 0; index < 900; index++) {
      writer.delete(cardRef(OWNER_UID, index));
    }

    const result = await writer.commit();

    expect(result.batches).toBe(2);
    expect(await countCards(OWNER_UID)).toBe(0);
  });
});
