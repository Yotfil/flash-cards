import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';

import {
  PackageFullError,
  PracticeItemGoneError,
  PracticePackageGoneError,
} from '@domain/ports/practice-package.repository';
import { InvalidDocumentError } from '@infrastructure/firestore/document-boundary';
import { FirestorePracticePackageRepository } from '@infrastructure/firestore/practice-package.repository.firestore';
import { FakeLogger } from '@testing/fake-logger';

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
let logger: FakeLogger;

beforeAll(async () => {
  environment = await createRulesTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedAllowlist(environment, [OWNER_EMAIL]);
  logger = new FakeLogger();
  repository = new FirestorePracticePackageRepository(
    modularFirestore(ownerContext(environment, OWNER_UID, OWNER_EMAIL)),
    logger,
  );
});

/** Otro dispositivo (u otra pestaña) de la misma cuenta: su propio cliente, su caché y su registro. */
function anotherDevice(): { device: FirestorePracticePackageRepository; deviceLogger: FakeLogger } {
  const deviceLogger = new FakeLogger();
  const device = new FirestorePracticePackageRepository(
    modularFirestore(ownerContext(environment, OWNER_UID, OWNER_EMAIL)),
    deviceLogger,
  );
  return { device, deviceLogger };
}

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

  it('un ítem listado con datos incompletos hace inválido el documento, con la ruta del campo', async () => {
    await asAdmin((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'practicePackages', 'p1'), {
        name: 'Película',
        capacity: 20,
        status: 'open',
        items: { i1: { cardType: 'basic', front: 'a', back: 'b' } },
        itemOrder: ['i1'],
        createdAt: Timestamp.now(),
      }),
    );

    const failure = await repository.listByUser(OWNER_UID).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(InvalidDocumentError);
    expect((failure as InvalidDocumentError).issues.map((issue) => issue.field)).toEqual([
      'items.i1.addedAt',
    ]);
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

  it('calificar en un paquete que ya no existe se rechaza con "el paquete ya no existe"', async () => {
    const pkg = await repository.create(OWNER_UID, { name: 'Película', capacity: 20 });
    const [item] = await repository.addItems(OWNER_UID, pkg.id, [basic('a', 'b')]);
    const { device: computer } = anotherDevice();
    await computer.delete(OWNER_UID, pkg.id);

    const failure = await repository
      .recordGrade(OWNER_UID, pkg.id, item?.id ?? '', { grade: 3, dayId: '2026-10-26' })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PracticePackageGoneError);
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

describe('FirestorePracticePackageRepository · un ítem borrado en otro dispositivo', () => {
  it('calificarlo desde el que aún lo tenía no impide leer: el paquete sale sin él y el registro avisa', async () => {
    // El móvil arma la práctica de "Película" con «to give up»; en el computador, Ada lo borra.
    const film = await repository.create(OWNER_UID, { name: 'Película', capacity: 20 });
    const [giveUp, lookUp] = await repository.addItems(OWNER_UID, film.id, [
      basic('to give up', 'rendirse'),
      basic('to look up', 'buscar'),
    ]);
    const meeting = await repository.create(OWNER_UID, { name: 'Reunión', capacity: 20 });
    await repository.addItems(OWNER_UID, meeting.id, [basic('to follow up', 'dar seguimiento')]);
    const { device: computer, deviceLogger: computerLogger } = anotherDevice();
    await computer.removeItem(OWNER_UID, film.id, giveUp?.id ?? '');

    // Con la lista vieja, el móvil lo califica: la nota deja un resto suelto en el documento.
    await repository.recordGrade(OWNER_UID, film.id, giveUp?.id ?? '', {
      grade: 1,
      dayId: '2026-10-26',
    });
    const listed = await computer.listByUser(OWNER_UID);

    expect(listed.map((pkg) => pkg.id)).toEqual([film.id, meeting.id]);
    expect(listed[0]?.itemOrder).toEqual([lookUp?.id]);
    expect(Object.keys(listed[0]?.items ?? {})).toEqual([lookUp?.id]);
    expect(computerLogger.entries).toEqual([
      {
        level: 'warn',
        message: expect.stringContaining(`users/${OWNER_UID}/practicePackages/${film.id}`),
      },
    ]);
  });

  it('editarlo desde el formulario que el otro tenía abierto falla sin dejar ningún resto', async () => {
    const film = await repository.create(OWNER_UID, { name: 'Película', capacity: 20 });
    const [giveUp, lookUp] = await repository.addItems(OWNER_UID, film.id, [
      basic('to give up', 'rendirse'),
      basic('to look up', 'buscar'),
    ]);
    const { device: computer } = anotherDevice();
    await repository.removeItem(OWNER_UID, film.id, lookUp?.id ?? '');

    const failure = await computer
      .updateItem(
        OWNER_UID,
        film.id,
        lookUp?.id ?? '',
        basic('to look up', 'buscar (en el diccionario)'),
      )
      .catch((error: unknown) => error);
    const raw = await asAdmin(async (db) =>
      (await getDoc(doc(db, 'users', OWNER_UID, 'practicePackages', film.id))).data(),
    );

    expect(failure).toBeInstanceOf(PracticeItemGoneError);
    expect(Object.keys(raw?.['items'] ?? {})).toEqual([giveUp?.id]);
  });

  it('editar un ítem de un paquete que ya no existe falla sin crearlo', async () => {
    const film = await repository.create(OWNER_UID, { name: 'Película', capacity: 20 });
    const [giveUp] = await repository.addItems(OWNER_UID, film.id, [
      basic('to give up', 'rendirse'),
    ]);
    await repository.delete(OWNER_UID, film.id);

    const failure = await repository
      .updateItem(OWNER_UID, film.id, giveUp?.id ?? '', basic('to give up', 'abandonar'))
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PracticePackageGoneError);
    expect(await repository.listByUser(OWNER_UID)).toEqual([]);
  });
});
