import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { PracticePackage } from '@domain/models/practice-package';
import type { UserSettings } from '@domain/models/user.model';
import { CardRepository } from '@domain/ports/card.repository';
import { Logger } from '@domain/ports/logger.port';
import { PracticePackageRepository } from '@domain/ports/practice-package.repository';
import { SessionService } from '@services/session/session.service';
import { FakeCardRepository } from '@testing/fake-card-repository';
import { FakeLogger } from '@testing/fake-logger';
import {
  FakePracticePackageRepository,
  aPackage,
  anItem,
} from '@testing/fake-practice-package-repository';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { DEFAULT_PROMPT_TEMPLATE } from './build-prompt';
import { PracticeAiHandoffService } from './practice-ai-handoff.service';
import { PracticePackagesService } from './practice-packages.service';

// Sábado 25 de octubre de 2026, 10:00 en Bogotá (día de estudio 2026-10-25, inicio a las 4).
const T0 = new Date('2026-10-25T15:00:00Z');
const TODAY = '2026-10-25';
const YESTERDAY = '2026-10-24';

const hard = (id: string) => anItem({ id, lastGrade: 1, lastPracticedDayId: YESTERDAY });
const good = (id: string) => anItem({ id, lastGrade: 3, lastPracticedDayId: YESTERDAY });
const fresh = (id: string) => anItem({ id, front: `front ${id}`, back: `back ${id}` });

async function setup(
  options: { packages?: PracticePackage[]; settings?: Partial<UserSettings> } = {},
) {
  const repository = new FakePracticePackageRepository();
  repository.seed(...(options.packages ?? []));
  const cards = new FakeCardRepository();
  const logger = new FakeLogger();
  const user = aUser({ id: 'u9' });
  TestBed.configureTestingModule({
    providers: [
      { provide: PracticePackageRepository, useValue: repository },
      { provide: CardRepository, useValue: cards },
      { provide: Logger, useValue: logger },
      {
        provide: SessionService,
        useValue: new FakeSessionService({
          kind: 'active',
          user: { ...user, settings: { ...user.settings, ...options.settings } },
        }),
      },
    ],
  });
  const service = TestBed.inject(PracticePackagesService);
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  service.reload();
  await settle();
  return {
    service,
    repository,
    cards,
    logger,
    settle,
    handoff: TestBed.inject(PracticeAiHandoffService),
  };
}

describe('PracticePackagesService · lista', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('separa los abiertos de los completados (estos, el más reciente primero)', async () => {
    const { service, repository } = await setup({
      packages: [
        aPackage({ id: 'a' }),
        aPackage({ id: 'old', status: 'completed', completedAt: new Date('2026-10-10') }),
        aPackage({ id: 'b' }),
        aPackage({ id: 'new', status: 'completed', completedAt: new Date('2026-10-15') }),
      ],
    });

    expect(repository.listedUids).toEqual(['u9']);
    expect(service.status()).toBe('ready');
    expect(service.open().map((pkg) => pkg.id)).toEqual(['a', 'b']);
    expect(service.completed().map((pkg) => pkg.id)).toEqual(['new', 'old']);
  });

  it('un documento malformado es un fallo de carga, registrado; reintentar lo recupera', async () => {
    const { service, repository, logger, settle } = await setup();
    repository.failWith.listByUser = new Error('Documento inválido en users/u9/practicePackages/x');
    service.reload();
    await settle();

    expect(service.status()).toBe('error');
    expect(logger.entries.at(-1)?.level).toBe('error');

    delete repository.failWith.listByUser;
    service.reload();
    await settle();
    expect(service.status()).toBe('ready');
  });

  it('crear usa el ajuste "Ítems por paquete" del perfil y queda abierto y vacío', async () => {
    const { service } = await setup({ settings: { practicePackageCapacity: 12 } });

    const created = await service.create('  Película del viernes ');

    expect(created).toEqual(
      expect.objectContaining({ name: 'Película del viernes', capacity: 12, status: 'open' }),
    );
    expect(service.open().map((pkg) => pkg.id)).toEqual([created.id]);
  });

  it('agregar no crea tarjetas; renombrar, editar, borrar y completar mutan tras el éxito', async () => {
    const { service, cards } = await setup({ packages: [aPackage({ id: 'p1' }, [fresh('a')])] });

    const [added] = await service.addItems('p1', [
      { cardType: 'basic', front: 'to call it a day', back: 'dar el día por terminado' },
    ]);
    await service.rename('p1', 'Nuevo nombre');
    await service.updateItem('p1', 'a', { cardType: 'basic', front: 'a', back: 'nuevo' });
    await service.removeItem('p1', added?.id ?? '');
    await service.complete('p1');

    const pkg = service.findById('p1');
    expect(pkg?.name).toBe('Nuevo nombre');
    expect(pkg?.itemOrder).toEqual(['a']);
    expect(pkg?.items['a']?.back).toBe('nuevo');
    expect(pkg?.status).toBe('completed');
    expect(pkg?.completedAt).toEqual(T0);
    expect(Object.values(cards.calls).every((count) => count === 0)).toBe(true);
  });

  it('si una escritura falla, se relanza y la lista no cambia', async () => {
    const { service, repository } = await setup({ packages: [aPackage({ id: 'p1' })] });
    repository.failWith.rename = new Error('sin red');

    await expect(service.rename('p1', 'Otro')).rejects.toThrow('sin red');
    expect(service.findById('p1')?.name).toBe('Película del viernes');
  });

  it('borrar lo quita de la lista', async () => {
    const { service } = await setup({ packages: [aPackage({ id: 'p1' })] });

    await service.remove('p1');

    expect(service.findById('p1')).toBeNull();
  });
});

describe('PracticePackagesService · práctica de hoy', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  const DAY_TWO = aPackage({ id: 'p1' }, [
    ...['h1', 'h2', 'h3', 'h4', 'h5'].map(hard),
    ...['g1', 'g2', 'g3'].map(good),
    ...['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map(fresh),
  ]);

  it('la primera práctica del día fija el conjunto (11) y lo entrega', async () => {
    const { service, repository, handoff } = await setup({ packages: [DAY_TWO] });

    expect(service.pendingCountFor(DAY_TWO)).toBe(11);
    expect(await service.prepareTodayPractice('p1')).toBe(11);

    expect(repository.todaySets).toEqual([
      { packageId: 'p1', todaySet: { dayId: TODAY, itemIds: expect.any(Array) } },
    ]);
    const prepared = handoff.take();
    expect(prepared?.dayId).toBe(TODAY);
    expect(prepared?.items.map((item) => item.id).sort()).toEqual(
      ['h1', 'h2', 'h3', 'h4', 'h5', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6'].sort(),
    );
    expect(service.practicedToday(service.findById('p1') as PracticePackage)).toBe(true);
  });

  it('repetir en el día usa el mismo conjunto sin volver a fijarlo', async () => {
    const { service, repository, handoff } = await setup({ packages: [DAY_TWO] });
    await service.prepareTodayPractice('p1');
    const first = handoff
      .take()
      ?.items.map((item) => item.id)
      .sort();
    await service.addItems('p1', [{ cardType: 'basic', front: 'tarde', back: 'late' }]);

    expect(await service.prepareTodayPractice('p1')).toBe(11);

    expect(repository.todaySets).toHaveLength(1);
    expect(
      handoff
        .take()
        ?.items.map((item) => item.id)
        .sort(),
    ).toEqual(first);
  });

  it('vaciar la bandeja quita la práctica preparada (ya no se va a abrir)', async () => {
    const { service, handoff } = await setup({ packages: [DAY_TWO] });
    await service.prepareTodayPractice('p1');

    service.discardPrepared();

    expect(handoff.prepared()).toBeNull();
  });

  it('sin nada para hoy: 0, sin fijar ni entregar', async () => {
    const { service, repository, handoff } = await setup({
      packages: [aPackage({ id: 'p1' }, [good('g1')])],
    });

    expect(await service.prepareTodayPractice('p1')).toBe(0);
    expect(repository.todaySets).toEqual([]);
    expect(handoff.prepared()).toBeNull();
  });

  it('a la 01:30 con inicio a las 4 el día de estudio es el anterior', async () => {
    vi.setSystemTime(new Date('2026-10-25T06:30:00Z'));
    const { service } = await setup();

    expect(service.currentDayId()).toBe(YESTERDAY);
  });

  it('el prompt usa la plantilla del perfil; sin ella, la por defecto; las notas de la práctica cuentan', async () => {
    const pkg = aPackage({ id: 'p1' }, [fresh('a'), fresh('b')]);
    const custom = await setup({
      packages: [pkg],
      settings: { promptTemplate: 'R:[[REPASADAS]] D:[[DIFICILES]]' },
    });
    await custom.service.prepareTodayPractice('p1');
    custom.service.applyGrade('p1', 'a', 1, TODAY);
    custom.service.applyGrade('p1', 'b', 4, TODAY);

    expect(custom.service.promptFor('p1')).toBe(
      'R:front a | back a\nfront b | back b D:front a | back a',
    );
    TestBed.resetTestingModule();

    const byDefault = await setup({ packages: [pkg] });
    expect(byDefault.service.promptFor('p1')).toContain("You're my English conversation partner.");
    expect(DEFAULT_PROMPT_TEMPLATE).toContain('[[REPASADAS]]');
  });

  it('un paquete completado da todos sus ítems como repasados y ninguno difícil', async () => {
    const pkg = aPackage({ id: 'p1', status: 'completed' }, [hard('a'), fresh('b')]);
    const { service } = await setup({
      packages: [pkg],
      settings: { promptTemplate: 'R:[[REPASADAS]] D:[[DIFICILES]]' },
    });

    expect(service.promptFor('p1')).toBe(
      'R:to call it a day | dar el día por terminado\nfront b | back b D:',
    );
  });
});
