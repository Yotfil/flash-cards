import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

import { initialCardScheduling } from '@domain/models/card-scheduling';
import { CardState, type NewCard } from '@domain/models/card.model';
import { PartialCreationError } from '@domain/models/partial-creation-error';
import { PartialDeletionError } from '@domain/models/partial-deletion-error';
import { BatchCommitError } from '@infrastructure/firestore/batch-writer';
import { FirestoreCardRepository } from '@infrastructure/firestore/card.repository.firestore';
import { InvalidDocumentError } from '@infrastructure/firestore/document-boundary';
import { orderReadyCards } from '@services/queue/ready-cards';

import {
  createRulesTestEnvironment,
  modularFirestore,
  ownerContext,
  seedAllowlist,
} from '../support/firestore-test-environment';

const OWNER_UID = 'u1';
const OWNER_EMAIL = 'ada@ejemplo.com';

let environment: RulesTestEnvironment;
let repository: FirestoreCardRepository;

beforeAll(async () => {
  environment = await createRulesTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedAllowlist(environment, [OWNER_EMAIL]);
  await asAdmin(async (db) => {
    await setDoc(doc(db, 'users', OWNER_UID, 'books', 'b1'), { name: 'Libro', cardCount: 10 });
    // Crear tarjetas exige que su capítulo exista.
    for (const chapterId of ['c1', 'c2']) {
      await setDoc(doc(db, 'users', OWNER_UID, 'chapters', chapterId), {
        bookId: 'b1',
        name: chapterId,
        order: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
  });
  repository = new FirestoreCardRepository(
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

const rawCard = (cardId: string) =>
  asAdmin(async (db) => (await getDoc(doc(db, 'users', OWNER_UID, 'cards', cardId))).data() ?? {});

function newCard(overrides: Partial<NewCard> = {}): NewCard {
  return {
    bookId: 'b1',
    chapterId: 'c1',
    noteId: 'n1',
    direction: 'forward',
    front: 'to give up',
    back: 'rendirse',
    scheduling: initialCardScheduling(new Date('2026-06-15T10:00:00.000Z')),
    suspended: false,
    ...overrides,
  };
}

describe('FirestoreCardRepository · CRUD', () => {
  it('una básica se guarda sin tipo ni ejemplo en el documento', async () => {
    const card = await repository.create(OWNER_UID, newCard());

    const raw = await rawCard(card.id);
    expect(raw).not.toHaveProperty('cardType');
    expect(raw).not.toHaveProperty('example');
    expect(card.scheduling.due).toBeInstanceOf(Date);
  });

  it('una cloze guarda su tipo y el reverso vacío; el ejemplo va recortado', async () => {
    const cloze = await repository.create(
      OWNER_UID,
      newCard({ cardType: 'cloze', front: 'El {{gato}}', back: '', example: '  Un gato negro. ' }),
    );

    expect(await rawCard(cloze.id)).toMatchObject({
      cardType: 'cloze',
      back: '',
      example: 'Un gato negro.',
    });
  });

  it('lista solo las tarjetas del capítulo', async () => {
    await repository.create(OWNER_UID, newCard({ front: 'uno' }));
    await repository.create(OWNER_UID, newCard({ chapterId: 'c2', front: 'otro' }));

    const cards = await repository.listByChapter(OWNER_UID, 'c1');

    expect(cards.map((card) => card.front)).toEqual(['uno']);
  });

  it('vaciar el ejemplo elimina el campo y conserva los campos futuros', async () => {
    const card = await repository.create(OWNER_UID, newCard({ example: 'Hi' }));
    await asAdmin((db) =>
      setDoc(
        doc(db, 'users', OWNER_UID, 'cards', card.id),
        { pronunciation: '/ɡɪv/', tags: ['verbos'] },
        { merge: true },
      ),
    );

    await repository.updateContent(OWNER_UID, card.id, { front: 'to give in', example: null });

    const raw = await rawCard(card.id);
    expect(raw).not.toHaveProperty('example');
    expect(raw).toMatchObject({ front: 'to give in', pronunciation: '/ɡɪv/', tags: ['verbos'] });
  });

  it('suspender cambia solo la bandera (y la fecha de actualización)', async () => {
    const card = await repository.create(OWNER_UID, newCard());
    const before = await rawCard(card.id);

    await repository.setSuspended(OWNER_UID, card.id, true);

    const after = await rawCard(card.id);
    expect(after['suspended']).toBe(true);
    expect(after['front']).toBe(before['front']);
    expect(after['scheduling']).toEqual(before['scheduling']);
  });

  it('un documento corrupto falla con un error que nombra su ruta', async () => {
    await asAdmin((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'cards', 'rota'), {
        bookId: 'b1',
        chapterId: 'c1',
        front: 'sin programación',
        createdAt: Timestamp.now(),
      }),
    );

    const failure = await repository
      .listByChapter(OWNER_UID, 'c1')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(InvalidDocumentError);
    expect((failure as InvalidDocumentError).path).toBe('users/u1/cards/rota');
  });
});

describe('FirestoreCardRepository · contador del libro', () => {
  const bookCount = () =>
    asAdmin(
      async (db) =>
        (await getDoc(doc(db, 'users', OWNER_UID, 'books', 'b1'))).data()?.['cardCount'],
    );

  it('crear 3 suma 3 al libro', async () => {
    const created = await repository.createMany(OWNER_UID, [newCard(), newCard(), newCard()]);

    expect(created).toHaveLength(3);
    expect(await bookCount()).toBe(13);
  });

  it('crear en un capítulo que otro dispositivo acaba de borrar falla sin crear ninguna ni sumar al libro', async () => {
    // El diálogo de importar seguía abierto en el computador; en el móvil se borró el capítulo.
    await asAdmin((db) => deleteDoc(doc(db, 'users', OWNER_UID, 'chapters', 'c1')));

    const failure = await repository
      .createMany(OWNER_UID, [newCard({ front: 'a' }), newCard({ front: 'b' })])
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect(await repository.listByChapter(OWNER_UID, 'c1')).toEqual([]);
    expect(await bookCount()).toBe(10);
  });

  it('borrar una resta 1 y conserva el historial de repasos', async () => {
    const card = await repository.create(OWNER_UID, newCard());
    await asAdmin((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log1'), { cardId: card.id }),
    );

    await repository.deleteWithCount(OWNER_UID, 'b1', card.id);

    expect(await rawCard(card.id)).toEqual({});
    expect(await bookCount()).toBe(10);
    expect(
      await asAdmin(async (db) =>
        (await getDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log1'))).exists(),
      ),
    ).toBe(true);
  });

  it('borrar dos veces la misma tarjeta (otra pestaña con la lista vieja) descuenta una sola vez', async () => {
    const [first] = await repository.createMany(OWNER_UID, [
      newCard({ front: 'to give up' }),
      newCard({ front: 'to look up' }),
    ]);

    await repository.deleteWithCount(OWNER_UID, 'b1', first!.id);
    await repository.deleteWithCount(OWNER_UID, 'b1', first!.id);

    expect(await bookCount()).toBe(11);
  });

  it('un borrado masivo con tarjetas que ya no existen descuenta solo las que borró', async () => {
    const created = await repository.createMany(OWNER_UID, [newCard(), newCard(), newCard()]);
    await repository.deleteWithCount(OWNER_UID, 'b1', created[0]!.id);

    const deleted = await repository.deleteManyWithCount(
      OWNER_UID,
      'b1',
      created.map((card) => card.id),
    );

    expect(deleted).toBe(2);
    expect(await bookCount()).toBe(10);
  });

  it('borrar 2 resta 2 y dice cuántas', async () => {
    const [first, second] = await repository.createMany(OWNER_UID, [newCard(), newCard()]);

    const deleted = await repository.deleteManyWithCount(OWNER_UID, 'b1', [first!.id, second!.id]);

    expect(deleted).toBe(2);
    expect(await bookCount()).toBe(10);
  });

  it('si agregar muchas se corta a mitad, el error trae las ya creadas y el contador cuadra', async () => {
    // 600 altas son dos lotes; el segundo se rechaza (un documento de más de 1 MiB).
    const drafts = Array.from({ length: 600 }, (_, index) =>
      newCard({
        front: `nueva ${index}`,
        ...(index === 500 ? { example: 'x'.repeat(1_100_000) } : {}),
      }),
    );

    const failure = await repository.createMany(OWNER_UID, drafts).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PartialCreationError);
    const created = (failure as PartialCreationError).createdCards;
    expect(created.length).toBeGreaterThan(0);
    expect(created.length).toBeLessThan(500);
    const stored = await repository.listByChapter(OWNER_UID, 'c1');
    expect(stored.map((card) => card.id).sort()).toEqual(created.map((card) => card.id).sort());
    expect(await bookCount()).toBe(10 + created.length);
  });

  it('si el borrado masivo se corta a mitad, el error nombra las ya borradas y el contador cuadra', async () => {
    const ids = Array.from({ length: 900 }, (_, index) => `k${index}`);
    await asAdmin(async (db) => {
      await setDoc(doc(db, 'users', OWNER_UID, 'books', 'b1'), { name: 'Libro', cardCount: 1000 });
      for (let start = 0; start < ids.length; start += 400) {
        const batch = writeBatch(db);
        ids.slice(start, start + 400).forEach((id) => {
          batch.set(doc(db, 'users', OWNER_UID, 'cards', id), { bookId: 'b1', chapterId: 'c1' });
        });
        await batch.commit();
      }
    });
    // Un id con barras cae fuera de las reglas (`cards/{cardId}` es un solo segmento), así que el
    // segundo tramo se rechaza después de confirmarse el primero.
    ids[448] = 'fuera/de/reglas';

    const failure = await repository
      .deleteManyWithCount(OWNER_UID, 'b1', ids)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PartialDeletionError);
    expect((failure as PartialDeletionError).deletedIds).toEqual(ids.slice(0, 448));
    expect(await bookCount()).toBe(1000 - 448);
  });
});

describe('FirestoreCardRepository · tarjetas listas', () => {
  const END_OF_DAY = new Date('2026-10-25T09:00:00Z');
  const HOUR_MS = 3_600_000;
  const dueAt = (offsetMs: number, state = CardState.Review) => ({
    ...initialCardScheduling(new Date('2026-10-01T10:00:00Z')),
    state,
    due: new Date(END_OF_DAY.getTime() + offsetMs),
  });

  beforeEach(async () => {
    await asAdmin((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'books', 'b2'), { name: 'Otro', cardCount: 0 }),
    );
    await repository.create(
      OWNER_UID,
      newCard({ front: 'vencida', scheduling: dueAt(-24 * HOUR_MS) }),
    );
    await repository.create(OWNER_UID, newCard({ front: 'justo al límite', scheduling: dueAt(0) }));
    await repository.create(
      OWNER_UID,
      newCard({ front: 'nueva', scheduling: dueAt(-10 * 24 * HOUR_MS, CardState.New) }),
    );
    await repository.create(OWNER_UID, newCard({ front: 'mañana', scheduling: dueAt(HOUR_MS) }));
    await repository.create(
      OWNER_UID,
      newCard({ front: 'suspendida', suspended: true, scheduling: dueAt(-HOUR_MS) }),
    );
    await repository.create(
      OWNER_UID,
      newCard({ bookId: 'b2', front: 'de otro libro', scheduling: dueAt(-HOUR_MS) }),
    );
  });

  const fronts = (cards: { front: string }[]) => cards.map((card) => card.front).sort();

  it('listReady trae vencidas y nuevas hasta el instante, también suspendidas; nunca las de después', async () => {
    const ready = await repository.listReady(OWNER_UID, END_OF_DAY);

    expect(fronts(ready)).toEqual(
      ['de otro libro', 'justo al límite', 'nueva', 'suspendida', 'vencida'].sort(),
    );
  });

  it('listReadyByBook trae solo las del libro dentro del mismo rango', async () => {
    const ready = await repository.listReadyByBook(OWNER_UID, 'b1', END_OF_DAY);

    expect(fronts(ready)).toEqual(['justo al límite', 'nueva', 'suspendida', 'vencida'].sort());
  });
});

describe('FirestoreCardRepository · orden de creación', () => {
  it('las nuevas creadas juntas entran en Hoy en el orden en que llegaron (el del archivo)', async () => {
    // Ada importa 30 palabras en orden; su tanda de hoy son 20.
    const fronts = Array.from(
      { length: 30 },
      (_, index) => `palabra ${String(index + 1).padStart(2, '0')}`,
    );
    await repository.createMany(
      OWNER_UID,
      fronts.map((front) => newCard({ front, noteId: front })),
    );

    const endOfDay = new Date('2026-12-31T00:00:00Z');
    const ordered = orderReadyCards(await repository.listReady(OWNER_UID, endOfDay), endOfDay);

    expect(ordered.slice(0, 20).map((card) => card.front)).toEqual(fronts.slice(0, 20));
  });
});

describe('FirestoreCardRepository · reemplazar las tarjetas de un capítulo', () => {
  const bookCount = () =>
    asAdmin(
      async (db) =>
        (await getDoc(doc(db, 'users', OWNER_UID, 'books', 'b1'))).data()?.['cardCount'],
    );
  const chapterFronts = async () =>
    (await repository.listByChapter(OWNER_UID, 'c1')).map((card) => card.front).sort();

  it('2 por 3: solo quedan las nuevas y el contador sube 1, en un lote', async () => {
    const old = await repository.createMany(OWNER_UID, [
      newCard({ front: 'vieja 1' }),
      newCard({ front: 'vieja 2' }),
    ]);
    await asAdmin((db) => updateDoc(doc(db, 'users', OWNER_UID, 'books', 'b1'), { cardCount: 10 }));

    const replacement = await repository.replaceInChapter(OWNER_UID, 'b1', 'c1', [
      newCard({ front: 'nueva 1' }),
      newCard({ front: 'nueva 2' }),
      newCard({ front: 'nueva 3' }),
    ]);

    expect(replacement.created.map((card) => card.front)).toEqual([
      'nueva 1',
      'nueva 2',
      'nueva 3',
    ]);
    expect(replacement.deletedCount).toBe(old.length);
    expect(await chapterFronts()).toEqual(['nueva 1', 'nueva 2', 'nueva 3']);
    expect(await bookCount()).toBe(11);
  });

  it('borra las que el capítulo tiene en el servidor, también las que otro dispositivo añadió', async () => {
    await repository.createMany(OWNER_UID, [
      newCard({ front: 'vieja 1' }),
      newCard({ front: 'vieja 2' }),
    ]);
    // El computador tenía cargadas las dos; en el móvil se añade otra antes de reemplazar.
    await repository.create(OWNER_UID, newCard({ front: 'añadida en el móvil' }));

    const replacement = await repository.replaceInChapter(OWNER_UID, 'b1', 'c1', [
      newCard({ front: 'nueva 1' }),
    ]);

    expect(await chapterFronts()).toEqual(['nueva 1']);
    expect(replacement.deletedCount).toBe(3);
    expect(await bookCount()).toBe(11);
  });

  it('reintentar un reemplazo grande que falló a mitad deja el capítulo como se quería', async () => {
    await repository.createMany(
      OWNER_UID,
      Array.from({ length: 300 }, (_, index) => newCard({ front: `vieja ${index}` })),
    );
    // 300 por 300 = 600 escrituras, dos lotes; el segundo se rechaza (un documento de más de 1 MiB).
    const drafts = Array.from({ length: 300 }, (_, index) => newCard({ front: `nueva ${index}` }));
    const huge = 'x'.repeat(1_100_000);
    const failure = await repository
      .replaceInChapter(
        OWNER_UID,
        'b1',
        'c1',
        drafts.map((draft, index) => (index === 200 ? { ...draft, example: huge } : draft)),
      )
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(BatchCommitError);

    // El diálogo conserva el texto y el usuario pulsa otra vez "Reemplazar todo".
    await repository.replaceInChapter(OWNER_UID, 'b1', 'c1', drafts);

    const fronts = await chapterFronts();
    expect(fronts).toHaveLength(300);
    expect(new Set(fronts).size).toBe(300);
    expect(await bookCount()).toBe(310);
  });

  it('si una parte no se puede escribir, el capítulo y el contador no cambian', async () => {
    await repository.createMany(OWNER_UID, [
      newCard({ front: 'vieja 1' }),
      newCard({ front: 'vieja 2' }),
    ]);
    await asAdmin((db) => updateDoc(doc(db, 'users', OWNER_UID, 'books', 'b1'), { cardCount: 10 }));

    // Un libro inexistente hace fallar el ajuste del contador: el lote entero se rechaza.
    const failure = await repository
      .replaceInChapter(OWNER_UID, 'no-existe', 'c1', [newCard({ bookId: 'no-existe' })])
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect(await chapterFronts()).toEqual(['vieja 1', 'vieja 2']);
    expect(await bookCount()).toBe(10);
  });
});

describe('FirestoreCardRepository · lectura completa de un libro', () => {
  it('trae todas las tarjetas del libro desde el servidor, y solo las de ese libro', async () => {
    await repository.createMany(
      OWNER_UID,
      Array.from({ length: 40 }, (_, index) => newCard({ front: `a${index}` })),
    );
    await asAdmin((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'books', 'b2'), { name: 'Otro', cardCount: 0 }),
    );
    await repository.createMany(
      OWNER_UID,
      Array.from({ length: 5 }, (_, index) => newCard({ bookId: 'b2', front: `b${index}` })),
    );

    expect(await repository.listByBookFromServer(OWNER_UID, 'b1')).toHaveLength(40);
  });

  it('un documento corrupto falla con un error que nombra su ruta', async () => {
    await asAdmin((db) => setDoc(doc(db, 'users', OWNER_UID, 'cards', 'roto'), { bookId: 'b1' }));

    const failure = await repository
      .listByBookFromServer(OWNER_UID, 'b1')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(InvalidDocumentError);
  });
});

describe('FirestoreCardRepository · tarjetas de un libro', () => {
  it('trae las tarjetas del libro y ninguna de otro', async () => {
    await repository.createMany(
      OWNER_UID,
      Array.from({ length: 3 }, (_, index) => newCard({ front: `a${index}` })),
    );
    await asAdmin((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'books', 'b2'), { name: 'Otro', cardCount: 0 }),
    );
    await repository.createMany(OWNER_UID, [newCard({ bookId: 'b2', front: 'ajena' })]);

    const cards = await repository.listByBook(OWNER_UID, 'b1');

    expect(cards.map((card) => card.front).sort()).toEqual(['a0', 'a1', 'a2']);
  });
});

describe('FirestoreCardRepository · tarjetas de un libro sin red', () => {
  // Practicar un libro lee con listByBook: sin red, el mensaje de vacío depende de esto.
  async function seedBookFromAnotherDevice() {
    const otherDevice = new FirestoreCardRepository(
      modularFirestore(ownerContext(environment, OWNER_UID, OWNER_EMAIL)),
    );
    await otherDevice.createMany(
      OWNER_UID,
      ['a', 'b', 'c'].map((front) => newCard({ front })),
    );
  }

  it('leído con red, sin red da las mismas tarjetas desde lo guardado', async () => {
    await seedBookFromAnotherDevice();
    const context = ownerContext(environment, OWNER_UID, OWNER_EMAIL);
    const device = new FirestoreCardRepository(modularFirestore(context));
    const online = await device.listByBook(OWNER_UID, 'b1');

    await context.firestore().disableNetwork();
    const offline = await device.listByBook(OWNER_UID, 'b1');
    await context.firestore().enableNetwork();

    expect(offline.map((card) => card.front).sort()).toEqual(['a', 'b', 'c']);
    expect(offline.length).toBe(online.length);
  });

  it('nunca leído en este dispositivo, sin red da una lista vacía sin error', async () => {
    await seedBookFromAnotherDevice();
    const context = ownerContext(environment, OWNER_UID, OWNER_EMAIL);
    const device = new FirestoreCardRepository(modularFirestore(context));

    await context.firestore().disableNetwork();
    const offline = await device.listByBook(OWNER_UID, 'b1');
    await context.firestore().enableNetwork();

    expect(offline).toEqual([]);
    expect(await device.listByBook(OWNER_UID, 'b1')).toHaveLength(3);
  });
});

describe('FirestoreCardRepository · lo guardado en el dispositivo', () => {
  const END_OF_DAY = new Date('2026-10-25T09:00:00Z');

  async function createdOnAnotherDevice() {
    const otherDevice = new FirestoreCardRepository(
      modularFirestore(ownerContext(environment, OWNER_UID, OWNER_EMAIL)),
    );
    await otherDevice.create(OWNER_UID, newCard({ front: 'to give up' }));
  }

  it('las tarjetas de un capítulo: nada antes de leer, lo leído después', async () => {
    await createdOnAnotherDevice();

    expect(await repository.listByChapter(OWNER_UID, 'c1', 'device')).toEqual([]);
    const fromServer = await repository.listByChapter(OWNER_UID, 'c1');
    expect(fromServer.map((card) => card.front)).toEqual(['to give up']);
    expect(await repository.listByChapter(OWNER_UID, 'c1', 'device')).toEqual(fromServer);
  });

  it('las tarjetas listas hasta el fin del día: nada antes de leer, lo leído después', async () => {
    await createdOnAnotherDevice();

    expect(await repository.listReady(OWNER_UID, END_OF_DAY, 'device')).toEqual([]);
    const fromServer = await repository.listReady(OWNER_UID, END_OF_DAY);
    expect(fromServer.map((card) => card.front)).toEqual(['to give up']);
    expect(await repository.listReady(OWNER_UID, END_OF_DAY, 'device')).toEqual(fromServer);
  });
});
