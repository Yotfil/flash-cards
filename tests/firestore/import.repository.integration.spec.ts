import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, getDocs, query, where, type Firestore } from 'firebase/firestore';

import { initialCardScheduling } from '@domain/models/card-scheduling';
import {
  ImportBookError,
  type ImportBookInput,
  type ImportedCardInput,
} from '@domain/ports/import.repository';
import { FirestoreImportRepository } from '@infrastructure/firestore/import.repository.firestore';

import {
  createRulesTestEnvironment,
  modularFirestore,
  ownerContext,
  seedAllowlist,
} from '../support/firestore-test-environment';

const OWNER_UID = 'u1';
const OWNER_EMAIL = 'ada@ejemplo.com';
const T0 = new Date('2026-10-24T15:00:00.000Z');

let environment: RulesTestEnvironment;
let repository: FirestoreImportRepository;

beforeAll(async () => {
  environment = await createRulesTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedAllowlist(environment, [OWNER_EMAIL]);
  repository = new FirestoreImportRepository(
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

const docsOf = (name: string, bookId?: string) =>
  asAdmin(async (db) => {
    const all = collection(db, 'users', OWNER_UID, name);
    return (await getDocs(bookId ? query(all, where('bookId', '==', bookId)) : all)).docs;
  });

function card(index: number, extra: Partial<ImportedCardInput> = {}): ImportedCardInput {
  return {
    noteId: `n${index}`,
    direction: 'forward',
    front: `f${index}`,
    back: `b${index}`,
    scheduling: initialCardScheduling(T0),
    suspended: false,
    ...extra,
  };
}

/** 3 capítulos y 1000 tarjetas: 1004 escrituras, tres lotes, el libro en el último. */
function bigBook(
  cardFor: (index: number) => ImportedCardInput = (index) => card(index),
): ImportBookInput {
  const sizes = [400, 350, 250];
  let next = 0;
  return {
    book: {
      name: 'Phrasal Verbs',
      subject: 'general',
      studyDirection: 'forward',
      newCardsPerDay: 20,
      maxReviewsPerDay: 200,
      order: 0,
      cardCount: 1000,
    },
    chapters: sizes.map((size, order) => ({
      name: `Capítulo ${order + 1}`,
      order,
      cards: Array.from({ length: size }, () => cardFor(next++)),
    })),
  };
}

describe('FirestoreImportRepository', () => {
  it('crea el libro con sus capítulos en orden y todas sus tarjetas', async () => {
    const book = await repository.importBook(
      OWNER_UID,
      bigBook((index) => (index === 0 ? card(0, { example: 'I gave up.' }) : card(index))),
    );

    const books = await docsOf('books');
    expect(books.map((stored) => stored.id)).toEqual([book.id]);
    expect(books[0]?.data()['cardCount']).toBe(1000);
    const chapters = (await docsOf('chapters', book.id)).map((chapter) => chapter.data());
    expect(chapters.map((chapter) => chapter['order']).sort()).toEqual([0, 1, 2]);
    const cards = await docsOf('cards', book.id);
    expect(cards).toHaveLength(1000);
    const chapterIds = new Set((await docsOf('chapters', book.id)).map((chapter) => chapter.id));
    expect(cards.every((stored) => chapterIds.has(stored.data()['chapterId']))).toBe(true);
    expect(cards.find((stored) => stored.data()['noteId'] === 'n0')?.data()['example']).toBe(
      'I gave up.',
    );
    expect(book.cardCount).toBe(1000);
  });

  it('si un lote falla a mitad, se borra lo escrito y el libro nunca aparece', async () => {
    // Un documento de más de 1 MiB: Firestore rechaza el segundo lote entero.
    const huge = 'x'.repeat(1_100_000);
    const failure = await repository
      .importBook(
        OWNER_UID,
        bigBook((index) => (index === 600 ? card(index, { example: huge }) : card(index))),
      )
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ImportBookError);
    expect((failure as ImportBookError).committedCount).toBe(450);
    expect((failure as ImportBookError).rolledBack).toBe(true);
    expect(await docsOf('books')).toHaveLength(0);
    expect(await docsOf('chapters')).toHaveLength(0);
    expect(await docsOf('cards')).toHaveLength(0);
  });
});
