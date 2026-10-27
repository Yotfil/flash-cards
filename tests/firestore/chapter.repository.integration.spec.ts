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

import { FirestoreChapterRepository } from '@infrastructure/firestore/chapter.repository.firestore';
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
let repository: FirestoreChapterRepository;

beforeAll(async () => {
  environment = await createRulesTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedAllowlist(environment, [OWNER_EMAIL]);
  repository = new FirestoreChapterRepository(
    modularFirestore(ownerContext(environment, OWNER_UID, OWNER_EMAIL)),
  );
});

async function asAdmin<T>(work: (db: Firestore) => Promise<T>): Promise<T> {
  let result!: T;
  await environment.withSecurityRulesDisabled(async (context) => {
    result = await work(modularFirestore(context));
  });
  return result;
}

function chapterData(bookId: string, name: string, order: number) {
  return { bookId, name, order, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
}

describe('FirestoreChapterRepository · CRUD', () => {
  it('lista solo los capítulos del libro, por su orden', async () => {
    await asAdmin(async (db) => {
      await setDoc(doc(db, 'users', OWNER_UID, 'chapters', 'c3'), chapterData('b1', 'Tres', 3));
      await setDoc(doc(db, 'users', OWNER_UID, 'chapters', 'c0'), chapterData('b1', 'Cero', 0));
      await setDoc(doc(db, 'users', OWNER_UID, 'chapters', 'c1'), chapterData('b1', 'Uno', 1));
      await setDoc(doc(db, 'users', OWNER_UID, 'chapters', 'x'), chapterData('b2', 'Otro', 0));
    });

    const chapters = await repository.listByBook(OWNER_UID, 'b1');

    expect(chapters.map((chapter) => chapter.order)).toEqual([0, 1, 3]);
  });

  it('crear devuelve el capítulo con sus fechas', async () => {
    const chapter = await repository.create(OWNER_UID, { bookId: 'b1', name: 'Uno', order: 0 });

    expect(chapter).toMatchObject({ bookId: 'b1', name: 'Uno', order: 0 });
    expect(chapter.createdAt).toBeInstanceOf(Date);
    const [read] = await repository.listByBook(OWNER_UID, 'b1');
    expect(read?.id).toBe(chapter.id);
  });

  it('renombrar cambia solo el nombre y la fecha de actualización', async () => {
    const chapter = await repository.create(OWNER_UID, { bookId: 'b1', name: 'Uno', order: 5 });

    await repository.rename(OWNER_UID, chapter.id, 'Primero');

    const [read] = await repository.listByBook(OWNER_UID, 'b1');
    expect(read).toMatchObject({ name: 'Primero', order: 5, bookId: 'b1' });
    expect(read?.createdAt).toEqual(chapter.createdAt);
  });

  it('un capítulo sin orden falla con un error que nombra su ruta', async () => {
    await asAdmin((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'chapters', 'roto'), {
        bookId: 'b1',
        name: 'Roto',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );

    const failure = await repository.listByBook(OWNER_UID, 'b1').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(InvalidDocumentError);
    expect((failure as InvalidDocumentError).path).toBe('users/u1/chapters/roto');
  });

  it('un capítulo con nombre vacío (de versiones anteriores) se lee', async () => {
    await asAdmin((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'chapters', 'c0'), chapterData('b1', '', 0)),
    );

    expect((await repository.listByBook(OWNER_UID, 'b1'))[0]?.name).toBe('');
  });
});

/** Siembra un libro con su contador y tarjetas en capítulos, en lotes, saltándose las reglas. */
async function seedBookWithCards(cardCount: number, cardsByChapter: Record<string, number>) {
  await asAdmin(async (db) => {
    await setDoc(doc(db, 'users', OWNER_UID, 'books', 'b1'), { name: 'Libro', cardCount });
    const writes: [string, Record<string, unknown>][] = [];
    for (const [chapterId, count] of Object.entries(cardsByChapter)) {
      writes.push([`chapters/${chapterId}`, chapterData('b1', chapterId, 0)]);
      for (let index = 0; index < count; index++) {
        writes.push([
          `cards/${chapterId}-${index}`,
          { bookId: 'b1', chapterId, front: 'f', back: 'b' },
        ]);
      }
    }
    for (let start = 0; start < writes.length; start += 400) {
      const batch = writeBatch(db);
      for (const [path, data] of writes.slice(start, start + 400)) {
        batch.set(doc(db, `users/${OWNER_UID}/${path}`), data);
      }
      await batch.commit();
    }
  });
}

const bookCardCount = () =>
  asAdmin(
    async (db) => (await getDoc(doc(db, 'users', OWNER_UID, 'books', 'b1'))).data()?.['cardCount'],
  );
const remaining = (collectionName: string) =>
  asAdmin(async (db) =>
    (await getDocs(collection(db, 'users', OWNER_UID, collectionName))).docs
      .map((d) => d.id)
      .sort(),
  );

describe('FirestoreChapterRepository · conteo y cascada', () => {
  it('cuenta las tarjetas de cada capítulo', async () => {
    await seedBookWithCards(43, { A: 42, B: 1 });

    expect(await repository.countCards(OWNER_UID, 'A')).toBe(42);
    expect(await repository.countCards(OWNER_UID, 'B')).toBe(1);
  });

  it('borra el capítulo con sus tarjetas, descuenta el libro y conserva lo demás', async () => {
    await seedBookWithCards(100, { A: 42, B: 58 });
    await asAdmin((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log1'), { cardId: 'A-0', rating: 3 }),
    );

    const deleted = await repository.deleteWithCards(OWNER_UID, 'b1', 'A');

    expect(deleted).toBe(42);
    expect(await remaining('chapters')).toEqual(['B']);
    expect((await remaining('cards')).every((id) => id.startsWith('B-'))).toBe(true);
    expect(await remaining('cards')).toHaveLength(58);
    expect(await bookCardCount()).toBe(58);
    expect(await remaining('reviewLogs')).toEqual(['log1']);
  });

  it('un capítulo vacío se borra sin tocar el contador del libro', async () => {
    await seedBookWithCards(7, { vacio: 0 });

    expect(await repository.deleteWithCards(OWNER_UID, 'b1', 'vacio')).toBe(0);
    expect(await remaining('chapters')).toEqual([]);
    expect(await bookCardCount()).toBe(7);
  });

  it('un capítulo con 900 tarjetas se borra entero y el libro baja exactamente 900', async () => {
    await seedBookWithCards(1000, { grande: 900 });

    expect(await repository.deleteWithCards(OWNER_UID, 'b1', 'grande')).toBe(900);
    expect(await remaining('cards')).toEqual([]);
    expect(await bookCardCount()).toBe(100);
  });

  it('con la red caída, borrar falla sin dejar tarjetas sueltas y el reintento lo borra todo', async () => {
    await seedBookWithCards(3, { A: 3 });
    const context = ownerContext(environment, OWNER_UID, OWNER_EMAIL);
    const db = modularFirestore(context);
    const device = new FirestoreChapterRepository(db);
    // El dispositivo solo había visto una de las tres tarjetas: es lo único que tiene en caché.
    await getDoc(doc(db, 'users', OWNER_UID, 'cards', 'A-0'));

    await context.firestore().disableNetwork();
    const offlineDeletion = device.deleteWithCards(OWNER_UID, 'b1', 'A').then(
      () => 'borró',
      () => 'falló',
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    await context.firestore().enableNetwork();

    expect(await offlineDeletion).toBe('falló');
    expect(await remaining('cards')).toHaveLength(3);
    expect(await remaining('chapters')).toEqual(['A']);
    expect(await device.deleteWithCards(OWNER_UID, 'b1', 'A')).toBe(3);
    expect(await remaining('cards')).toEqual([]);
    expect(await remaining('chapters')).toEqual([]);
    expect(await bookCardCount()).toBe(0);
  });
});

describe('FirestoreChapterRepository · lo guardado en el dispositivo', () => {
  it('lee lo guardado sin ir al servidor: nada antes de leer, lo leído después', async () => {
    const otherDevice = new FirestoreChapterRepository(
      modularFirestore(ownerContext(environment, OWNER_UID, OWNER_EMAIL)),
    );
    await otherDevice.create(OWNER_UID, { bookId: 'b1', name: 'Unidad 1', order: 0 });

    expect(await repository.listByBook(OWNER_UID, 'b1', 'device')).toEqual([]);
    const fromServer = await repository.listByBook(OWNER_UID, 'b1');
    expect(fromServer.map((chapter) => chapter.name)).toEqual(['Unidad 1']);
    expect(await repository.listByBook(OWNER_UID, 'b1', 'device')).toEqual(fromServer);
  });
});
