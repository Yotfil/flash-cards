import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

import type { BookDraft } from '@domain/models/book.model';
import { FirestoreBookRepository } from '@infrastructure/firestore/book.repository.firestore';
import { InvalidDocumentError } from '@infrastructure/firestore/document-boundary';

import {
  createRulesTestEnvironment,
  modularFirestore,
  ownerContext,
  seedAllowlist,
} from '../support/firestore-test-environment';

const OWNER_UID = 'u1';
const OWNER_EMAIL = 'ada@ejemplo.com';

let environment: RulesTestEnvironment;
let repository: FirestoreBookRepository;

beforeAll(async () => {
  environment = await createRulesTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedAllowlist(environment, [OWNER_EMAIL]);
  repository = new FirestoreBookRepository(
    modularFirestore(ownerContext(environment, OWNER_UID, OWNER_EMAIL)),
  );
});

/** Escribe documentos saltándose las reglas (datos sembrados por la prueba). */
async function seed(write: (db: Firestore) => Promise<void>): Promise<void> {
  await environment.withSecurityRulesDisabled((context) => write(modularFirestore(context)));
}

function draft(overrides: Partial<BookDraft & { order: number }> = {}) {
  return {
    name: 'Inglés',
    subject: 'language-en',
    studyDirection: 'forward' as const,
    newCardsPerDay: 20,
    maxReviewsPerDay: 200,
    order: 0,
    ...overrides,
  };
}

describe('FirestoreBookRepository · CRUD', () => {
  it('crea libros y los lista por su orden', async () => {
    const created = await repository.create(OWNER_UID, draft({ name: 'Segundo', order: 2 }));
    await repository.create(OWNER_UID, draft({ name: 'Primero', order: 0 }));
    await repository.create(OWNER_UID, draft({ name: 'Medio', order: 1 }));

    const books = await repository.listByUser(OWNER_UID);

    expect(books.map((book) => book.name)).toEqual(['Primero', 'Medio', 'Segundo']);
    expect(created).toMatchObject({ name: 'Segundo', cardCount: 0, order: 2 });
    expect(books[2]?.id).toBe(created.id);
    expect(books[2]?.createdAt).toBeInstanceOf(Date);
  });

  it('actualizar cambia solo lo pedido', async () => {
    const book = await repository.create(OWNER_UID, draft({ studyDirection: 'both' }));

    await repository.update(OWNER_UID, book.id, { newCardsPerDay: 5 });

    const [read] = await repository.listByUser(OWNER_UID);
    expect(read).toMatchObject({
      name: 'Inglés',
      studyDirection: 'both',
      newCardsPerDay: 5,
      maxReviewsPerDay: 200,
    });
  });

  it('un libro sin nombre falla con un error que nombra su ruta', async () => {
    await seed((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'books', 'roto'), {
        subject: 'general',
        studyDirection: 'forward',
        newCardsPerDay: 20,
        maxReviewsPerDay: 200,
        order: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );

    const failure = await repository.listByUser(OWNER_UID).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(InvalidDocumentError);
    expect((failure as InvalidDocumentError).path).toBe('users/u1/books/roto');
  });

  it('el contador de tarjetas suma y resta de forma atómica', async () => {
    const book = await repository.create(OWNER_UID, draft());
    await repository.incrementCardCount(OWNER_UID, book.id, 10);

    await repository.incrementCardCount(OWNER_UID, book.id, 3);
    expect((await repository.listByUser(OWNER_UID))[0]?.cardCount).toBe(13);

    await repository.incrementCardCount(OWNER_UID, book.id, -2);
    expect((await repository.listByUser(OWNER_UID))[0]?.cardCount).toBe(11);
  });
});

/** Siembra capítulos y tarjetas de un libro, en lotes, saltándose las reglas. */
async function seedContents(bookId: string, chapters: number, cards: number): Promise<void> {
  await seed(async (db) => {
    const writes: [string, string, Record<string, unknown>][] = [];
    for (let index = 0; index < chapters; index++) {
      writes.push([
        'chapters',
        `${bookId}-ch${index}`,
        { bookId, name: `Capítulo ${index}`, order: index },
      ]);
    }
    for (let index = 0; index < cards; index++) {
      writes.push(['cards', `${bookId}-c${index}`, { bookId, front: `f${index}`, back: 'b' }]);
    }
    for (let start = 0; start < writes.length; start += 400) {
      const batch = writeBatch(db);
      for (const [collectionName, id, data] of writes.slice(start, start + 400)) {
        batch.set(doc(db, 'users', OWNER_UID, collectionName, id), data);
      }
      await batch.commit();
    }
  });
}

async function idsIn(collectionName: string): Promise<string[]> {
  let ids: string[] = [];
  await seed(async (db) => {
    const snapshot = await getDocs(collection(db, 'users', OWNER_UID, collectionName));
    ids = snapshot.docs.map((document) => document.id).sort();
  });
  return ids;
}

describe('FirestoreBookRepository · contenidos y borrado en cascada', () => {
  it('cuenta los capítulos y tarjetas del libro', async () => {
    const book = await repository.create(OWNER_UID, draft());
    await seedContents(book.id, 3, 40);
    await seedContents('otro', 2, 5);

    expect(await repository.countContents(OWNER_UID, book.id)).toEqual({ chapters: 3, cards: 40 });
  });

  it('borra el libro con sus capítulos y tarjetas y conserva lo demás y el historial', async () => {
    const book = await repository.create(OWNER_UID, draft());
    const other = await repository.create(OWNER_UID, draft({ name: 'Otro', order: 1 }));
    await seedContents(book.id, 3, 40);
    await seedContents(other.id, 1, 2);
    await seed((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log1'), { bookId: book.id }),
    );

    await repository.deleteWithContents(OWNER_UID, book.id);

    expect((await repository.listByUser(OWNER_UID)).map((item) => item.id)).toEqual([other.id]);
    expect(await idsIn('chapters')).toEqual([`${other.id}-ch0`]);
    expect(await idsIn('cards')).toEqual([`${other.id}-c0`, `${other.id}-c1`]);
    let logExists = false;
    await seed(async (db) => {
      logExists = (await getDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log1'))).exists();
    });
    expect(logExists).toBe(true);
  });

  it('un libro con 900 tarjetas se borra en varios lotes sin error', async () => {
    const book = await repository.create(OWNER_UID, draft());
    await seedContents(book.id, 2, 900);

    await repository.deleteWithContents(OWNER_UID, book.id);

    expect(await idsIn('cards')).toEqual([]);
    expect(await repository.listByUser(OWNER_UID)).toEqual([]);
  });
});

describe('FirestoreBookRepository · totales por estado', () => {
  it('cuenta nuevas, en aprendizaje (aprendiendo + reaprendiendo) y dominadas', async () => {
    const book = await repository.create(OWNER_UID, draft());
    const states = [
      ...Array<number>(20).fill(0),
      ...Array<number>(3).fill(1),
      ...Array<number>(1).fill(3),
      ...Array<number>(12).fill(2),
    ];
    await seed(async (db) => {
      const batch = writeBatch(db);
      states.forEach((state, index) =>
        batch.set(doc(db, 'users', OWNER_UID, 'cards', `c${index}`), {
          bookId: book.id,
          scheduling: { state },
        }),
      );
      batch.set(doc(db, 'users', OWNER_UID, 'cards', 'ajena'), {
        bookId: 'otro',
        scheduling: { state: 2 },
      });
      await batch.commit();
    });

    expect(await repository.countCardsByState(OWNER_UID, book.id)).toEqual({
      newCards: 20,
      learning: 4,
      review: 12,
    });
  });
});

describe('FirestoreBookRepository · colección', () => {
  it('cuenta por estado todas las tarjetas de la cuenta, de todos los libros', async () => {
    const states = [0, 0, 0, 1, 3, 2, 2, 2, 2, 2];
    await seed(async (db) => {
      const batch = writeBatch(db);
      states.forEach((state, index) =>
        batch.set(doc(db, 'users', OWNER_UID, 'cards', `c${index}`), {
          bookId: index % 2 === 0 ? 'libro-a' : 'libro-b',
          scheduling: { state },
          suspended: index === 0,
        }),
      );
      batch.set(doc(db, 'users', 'otra-cuenta', 'cards', 'ajena'), {
        bookId: 'libro-a',
        scheduling: { state: 2 },
      });
      await batch.commit();
    });

    expect(await repository.countCollectionByState(OWNER_UID)).toEqual({
      newCards: 3,
      learning: 2,
      review: 5,
    });
  });

  it('una cuenta sin tarjetas cuenta cero en los tres grupos', async () => {
    expect(await repository.countCollectionByState(OWNER_UID)).toEqual({
      newCards: 0,
      learning: 0,
      review: 0,
    });
  });
});
