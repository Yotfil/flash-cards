import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';

import { initialCardScheduling } from '@domain/models/card-scheduling';
import { CardState, type NewCard } from '@domain/models/card.model';
import { PartialDeletionError } from '@domain/models/partial-deletion-error';
import { FirestoreCardRepository } from '@infrastructure/firestore/card.repository.firestore';
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
  await asAdmin((db) =>
    setDoc(doc(db, 'users', OWNER_UID, 'books', 'b1'), { name: 'Libro', cardCount: 10 }),
  );
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

  it('borrar 2 resta 2 y dice cuántas', async () => {
    const [first, second] = await repository.createMany(OWNER_UID, [newCard(), newCard()]);

    const deleted = await repository.deleteManyWithCount(OWNER_UID, 'b1', [first!.id, second!.id]);

    expect(deleted).toBe(2);
    expect(await bookCount()).toBe(10);
  });

  it('si el borrado masivo se corta a mitad, el error nombra las ya borradas y el contador cuadra', async () => {
    await asAdmin((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'books', 'b1'), { name: 'Libro', cardCount: 1000 }),
    );
    const ids = Array.from({ length: 900 }, (_, index) => `k${index}`);
    // Un id con barras cae fuera de las reglas (`cards/{cardId}` es un solo segmento), así que el
    // segundo lote se rechaza después de confirmarse el primero.
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
