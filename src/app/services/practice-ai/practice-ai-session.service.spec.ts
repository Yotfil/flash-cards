import { TestBed } from '@angular/core/testing';

import { Logger } from '@domain/ports/logger.port';
import {
  PracticePackageGoneError,
  PracticePackageRepository,
} from '@domain/ports/practice-package.repository';
import { SessionService } from '@services/session/session.service';
import { FakeLogger } from '@testing/fake-logger';
import {
  FakePracticePackageRepository,
  aPackage,
  anItem,
} from '@testing/fake-practice-package-repository';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { PracticeAiSessionService } from './practice-ai-session.service';
import { PracticePackagesService } from './practice-packages.service';

const ITEMS = ['a', 'b', 'c'].map((id) => anItem({ id, front: `front ${id}`, back: `back ${id}` }));

// Sin repositorios de tarjetas ni del repaso: si los necesitara, ni siquiera se podría crear.
function setup() {
  const packages = new FakePracticePackageRepository();
  packages.seed(aPackage({}, ITEMS));
  const logger = new FakeLogger();
  TestBed.configureTestingModule({
    providers: [
      { provide: PracticePackageRepository, useValue: packages },
      { provide: Logger, useValue: logger },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser({ id: 'u9' }) }),
      },
    ],
  });
  const session = TestBed.inject(PracticeAiSessionService);
  session.start({ packageId: 'p1', dayId: '2026-10-25', items: ITEMS });
  const flush = () => new Promise((resolve) => setTimeout(resolve));
  return { session, packages, logger, flush };
}

describe('PracticeAiSessionService', () => {
  it('empieza con el primero sin revelar, la posición y el total', () => {
    const { session } = setup();

    expect(session.status()).toBe('active');
    expect(session.current()).toBeDefined();
    expect(session.revealed()).toBe(false);
    expect(session.position()).toBe(1);
    expect(session.total()).toBe(3);
    expect(session.progress()).toBe(0);
  });

  it('calificar guarda la nota y el día del ítem sin esperar, y avanza al instante', () => {
    const { session, packages } = setup();
    const first = session.current();

    session.reveal();
    session.grade(2);

    expect(packages.grades).toEqual([
      { packageId: 'p1', itemId: first?.id, grade: 2, dayId: '2026-10-25' },
    ]);
    expect(packages.pendingGradeCount).toBe(1);
    expect(session.position()).toBe(2);
    expect(session.revealed()).toBe(false);
  });

  it('al terminar: notas por grado, los difíciles y todo lo practicado', () => {
    const { session } = setup();
    for (const rating of [1, 3, 2] as const) {
      session.reveal();
      session.grade(rating);
    }

    expect(session.status()).toBe('finished');
    expect(session.progress()).toBe(1);
    expect(session.ratingCounts()).toEqual({ again: 1, hard: 1, good: 1, easy: 0 });
    expect(session.hardCount()).toBe(2);
    expect(
      session
        .reviewedFaces()
        .map((face) => face.id)
        .sort(),
    ).toEqual(['a', 'b', 'c']);
    expect(session.hardFaces()).toHaveLength(2);
  });

  it('si el servidor rechaza una nota: aviso, registro y el ítem vuelve al final', async () => {
    const { session, packages, logger, flush } = setup();
    const first = session.current();
    session.reveal();
    session.grade(3);

    packages.rejectNext(new Error('sin permiso'));
    await flush();

    expect(session.alerts()).toEqual([{ front: first?.front }]);
    expect(logger.entries.at(-1)?.level).toBe('error');
    expect(session.total()).toBe(4);
  });

  it('si el paquete ya no existe (se borró en otro dispositivo), la práctica se cierra sin reencolar', async () => {
    const { session, packages, logger, flush } = setup();
    session.reveal();
    session.grade(3);
    session.reveal();
    session.grade(3);

    // El servidor rechaza las dos notas: el paquete se borró en el computador.
    packages.rejectNext(new PracticePackageGoneError('p1'));
    packages.rejectNext(new PracticePackageGoneError('p1'));
    await flush();

    expect(session.status()).toBe('gone');
    expect(session.total()).toBe(3);
    expect(session.alerts()).toEqual([]);
    expect(session.current()).toBeUndefined();
    expect(logger.entries.filter((entry) => entry.level === 'error')).toHaveLength(2);
  });

  it('una nota rechazada de una práctica anterior no toca la nueva', async () => {
    const { session, packages, flush } = setup();
    session.reveal();
    session.grade(3);

    session.start({ packageId: 'p1', dayId: '2026-10-25', items: ITEMS });
    packages.rejectNext();
    await flush();

    expect(session.alerts()).toEqual([]);
    expect(session.total()).toBe(3);
  });

  it('reset lo vacía todo', () => {
    const { session } = setup();

    session.reset();

    expect(session.status()).toBe('idle');
    expect(session.current()).toBeUndefined();
    expect(session.packageId()).toBeNull();
  });

  it('cada nota se ve ya en la lista de paquetes (detalle y prompt), sin releer', async () => {
    const { session, packages, flush } = setup();
    const list = TestBed.inject(PracticePackagesService);
    list.reload();
    await flush();
    TestBed.tick();
    await flush();
    const first = session.current();

    session.reveal();
    session.grade(1);

    expect(list.findById('p1')?.items[first?.id ?? '']).toEqual(
      expect.objectContaining({ lastGrade: 1, lastPracticedDayId: '2026-10-25' }),
    );
    expect(packages.calls.listByUser).toBe(1);
  });

  it('la primera nota fija el conjunto del día con lo preparado, en el orden del paquete; las siguientes no', async () => {
    const { session, packages, flush } = setup();
    const list = TestBed.inject(PracticePackagesService);
    list.reload();
    await flush();
    TestBed.tick();
    await flush();
    expect(packages.todaySets).toEqual([]);

    for (const rating of [1, 3] as const) {
      session.reveal();
      session.grade(rating);
    }

    expect(packages.todaySets).toEqual([
      { packageId: 'p1', todaySet: { dayId: '2026-10-25', itemIds: ['a', 'b', 'c'] } },
    ]);
  });
});
