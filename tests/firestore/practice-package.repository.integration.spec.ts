import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';

import { PackageFullError } from '@domain/ports/practice-package.repository';
import { InvalidDocumentError } from '@infrastructure/firestore/document-boundary';
import { FirestorePracticePackageRepository } from '@infrastructure/firestore/practice-package.repository.firestore';

import {
  createRulesTestEnvironment,
  modularFirestore,
  ownerContext,
  seedAllowlist,
} from '../support/firestore-test-environment';

const OWNER_UID = 'u1';
const OWNER_EMAIL = 'ada@ejemplo.com';

let environment: RulesTestEnvironment;
let repository: FirestorePracticePackageRepository;

beforeAll(async () => {
  environment = await createRulesTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedAllowlist(environment, [OWNER_EMAIL]);
  repository = new FirestorePracticePackageRepository(
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

const basic = (front: string, back: string) => ({ cardType: 'basic' as const, front, back });

describe('FirestorePracticePackageRepository · paquetes', () => {
  it('crea un paquete abierto y vacío con su capacidad, y los lista por fecha de creación', async () => {
    const first = await repository.create(OWNER_UID, {
      name: 'Película del viernes',
      capacity: 20,
    });
    const second = await repository.create(OWNER_UID, { name: 'Reunión', capacity: 10 });

    expect(first).toEqual(
      expect.objectContaining({
        name: 'Película del viernes',
        capacity: 20,
        status: 'open',
        items: {},
        itemOrder: [],
      }),
    );
    const listed = await repository.listByUser(OWNER_UID);
    expect(listed.map((pkg) => pkg.id)).toEqual([first.id, second.id]);
    expect(listed[1]?.capacity).toBe(10);
  });

  it('renombra, completa con fecha y borra', async () => {
    const pkg = await repository.create(OWNER_UID, { name: 'Viejo', capacity: 20 });
    const completedAt = new Date('2026-10-25T15:00:00.000Z');

    await repository.rename(OWNER_UID, pkg.id, 'Nuevo');
    await repository.complete(OWNER_UID, pkg.id, completedAt);
    const [stored] = await repository.listByUser(OWNER_UID);
    expect(stored).toEqual(
      expect.objectContaining({ name: 'Nuevo', status: 'completed', completedAt }),
    );

    await repository.delete(OWNER_UID, pkg.id);
    expect(await repository.listByUser(OWNER_UID)).toEqual([]);
  });

  it('un documento corrupto falla con un error que nombra su ruta', async () => {
    await asAdmin((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'practicePackages', 'roto'), { name: 'Sin más' }),
    );

    const failure = await repository.listByUser(OWNER_UID).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(InvalidDocumentError);
  });
});

describe('FirestorePracticePackageRepository · ítems', () => {
  it('agrega al final con id propio, en el mapa y en el orden', async () => {
    const pkg = await repository.create(OWNER_UID, { name: 'Película', capacity: 20 });

    const added = await repository.addItems(OWNER_UID, pkg.id, [
      basic('to call it a day', 'dar el día por terminado'),
      { cardType: 'cloze', front: 'She {{gave up}} too early', back: '', example: '  ' },
    ]);
    const [stored] = await repository.listByUser(OWNER_UID);

    expect(added.map((item) => item.id)).toEqual(stored?.itemOrder);
    expect(stored?.items[added[0]?.id ?? '']).toEqual(
      expect.objectContaining({ front: 'to call it a day', cardType: 'basic' }),
    );
    expect(stored?.items[added[1]?.id ?? '']).toEqual(
      expect.objectContaining({ cardType: 'cloze', back: '' }),
    );
    expect(stored?.items[added[1]?.id ?? '']?.example).toBeUndefined();
  });

  it('si no caben todos, rechaza sin escribir nada', async () => {
    const pkg = await repository.create(OWNER_UID, { name: 'Chico', capacity: 2 });
    await repository.addItems(OWNER_UID, pkg.id, [basic('a', 'b')]);

    const failure = await repository
      .addItems(OWNER_UID, pkg.id, [basic('c', 'd'), basic('e', 'f')])
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PackageFullError);
    const [stored] = await repository.listByUser(OWNER_UID);
    expect(stored?.itemOrder).toHaveLength(1);
  });

  it('edita el contenido de un ítem y borra otro', async () => {
    const pkg = await repository.create(OWNER_UID, { name: 'Película', capacity: 20 });
    const [kept, removed] = await repository.addItems(OWNER_UID, pkg.id, [
      basic('a', 'b'),
      basic('c', 'd'),
    ]);

    await repository.updateItem(OWNER_UID, pkg.id, kept?.id ?? '', {
      cardType: 'basic',
      front: 'a',
      back: 'nuevo',
      example: 'Un ejemplo.',
    });
    await repository.removeItem(OWNER_UID, pkg.id, removed?.id ?? '');
    const [stored] = await repository.listByUser(OWNER_UID);

    expect(stored?.itemOrder).toEqual([kept?.id]);
    expect(stored?.items[kept?.id ?? '']).toEqual(
      expect.objectContaining({ back: 'nuevo', example: 'Un ejemplo.' }),
    );
    expect(Object.keys(stored?.items ?? {})).toEqual([kept?.id]);
  });

  it('fija el conjunto del día', async () => {
    const pkg = await repository.create(OWNER_UID, { name: 'Película', capacity: 20 });
    const [item] = await repository.addItems(OWNER_UID, pkg.id, [basic('a', 'b')]);

    await repository.fixTodaySet(OWNER_UID, pkg.id, {
      dayId: '2026-10-25',
      itemIds: [item?.id ?? ''],
    });
    const [stored] = await repository.listByUser(OWNER_UID);

    expect(stored?.todaySet).toEqual({ dayId: '2026-10-25', itemIds: [item?.id] });
  });

  it('calificar cambia solo la última calificación y el día de ese ítem', async () => {
    const pkg = await repository.create(OWNER_UID, { name: 'Película', capacity: 20 });
    const [graded, other] = await repository.addItems(OWNER_UID, pkg.id, [
      basic('a', 'b'),
      basic('c', 'd'),
    ]);

    await repository.recordGrade(OWNER_UID, pkg.id, graded?.id ?? '', {
      grade: 2,
      dayId: '2026-10-25',
    });
    const raw = await asAdmin(async (db) =>
      (await getDoc(doc(db, 'users', OWNER_UID, 'practicePackages', pkg.id))).data(),
    );

    expect(raw?.['items'][graded?.id ?? '']).toEqual(
      expect.objectContaining({ front: 'a', lastGrade: 2, lastPracticedDayId: '2026-10-25' }),
    );
    expect(raw?.['items'][other?.id ?? '']).toEqual({
      cardType: 'basic',
      front: 'c',
      back: 'd',
      addedAt: expect.any(Timestamp),
    });
  });
});
