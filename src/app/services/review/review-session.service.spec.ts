import { TestBed } from '@angular/core/testing';

import { AccessRevokedError } from '@domain/models/access-revoked-error';
import type { Card, CardScheduling } from '@domain/models/card.model';
import { RATINGS, type Rating } from '@domain/models/rating';
import { CardGoneError, GradePersistencePort } from '@domain/ports/grade-persistence.port';
import { Logger } from '@domain/ports/logger.port';
import { SchedulingPort, type SchedulingPreview } from '@domain/ports/scheduling.port';
import type { PreparedStudy } from '@services/queue/study-handoff.service';
import { CardCollectionChanges } from '@services/progress/card-collection-changes';
import { SessionService } from '@services/session/session.service';
import { aCard } from '@testing/fake-card-repository';
import { FakeGradePersistence } from '@testing/fake-grade-persistence';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSchedulingPort } from '@testing/fake-scheduling-port';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { ReviewSessionService } from './review-session.service';

const T0 = new Date('2026-10-24T15:00:00Z');
const at = (ms: number) => new Date(T0.getTime() + ms);

const A = aCard({ id: 'A', front: 'to give up' });
const B = aCard({ id: 'B', front: 'to look up' });
const C = aCard({ id: 'C', front: 'to put off' });
const prepared = (cards: Card[] = [A, B, C]): PreparedStudy => ({
  cards,
  source: { kind: 'today' },
});

function setup(autoGradeByTime = true) {
  const scheduling = new FakeSchedulingPort();
  const persistence = new FakeGradePersistence();
  const logger = new FakeLogger();
  const user = aUser();
  const session = new FakeSessionService({
    kind: 'active',
    user: { ...user, settings: { ...user.settings, autoGradeByTime } },
  });
  TestBed.configureTestingModule({
    providers: [
      { provide: SchedulingPort, useValue: scheduling },
      { provide: GradePersistencePort, useValue: persistence },
      { provide: Logger, useValue: logger },
      { provide: SessionService, useValue: session },
    ],
  });
  return {
    service: TestBed.inject(ReviewSessionService),
    scheduling,
    persistence,
    logger,
    session,
  };
}

/** Toda nota vence en un minuto: la tarjeta sigue lista hoy y vuelve al final de la sesión. */
function comesBackInAMinute(scheduling: CardScheduling, now: Date) {
  const due = new Date(now.getTime() + 60_000);
  const preview = (): SchedulingPreview => ({
    scheduling: { ...scheduling, due, lastReview: now },
    intervalDays: 0,
    due,
    log: {
      state: scheduling.state,
      due: scheduling.due,
      stability: scheduling.stability,
      difficulty: scheduling.difficulty,
      elapsedDays: scheduling.elapsedDays,
      lastElapsedDays: 0,
      scheduledDays: scheduling.scheduledDays,
    },
  });
  return Object.fromEntries(RATINGS.map((rating) => [rating, preview()])) as Record<
    Rating,
    SchedulingPreview
  >;
}

/** Deja que corran las promesas ya resueltas (confirmaciones y rechazos del guardado). */
const flush = () => new Promise((resolve) => setTimeout(resolve));

describe('ReviewSessionService · flujo', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('arranca con la primera tarjeta y su previsualización en ese instante', () => {
    const { service, scheduling } = setup();

    service.start(prepared());

    expect(service.status()).toBe('active');
    expect(service.current()?.card.id).toBe('A');
    expect(scheduling.calls.map((call) => call.now)).toEqual([T0]);
    expect(service.remaining()).toBe(3);
  });

  it('la sugerencia lee el ajuste del perfil tal cual', () => {
    const off = setup(false);
    off.service.start(prepared());
    vi.setSystemTime(at(3000));
    off.service.reveal();
    expect(off.service.suggested()).toBeNull();
    TestBed.resetTestingModule();

    vi.setSystemTime(T0);
    const on = setup(true);
    on.service.start(prepared());
    vi.setSystemTime(at(3000));
    on.service.reveal();
    expect(on.service.revealed()).toBe(true);
    expect(on.service.suggested()).toBe(3);
  });

  it('calificar calcula con el instante del toque y avanza sin esperar al guardado', async () => {
    const { service, scheduling, persistence } = setup();
    service.start(prepared());
    service.reveal();

    vi.setSystemTime(at(40_000));
    service.grade(3);

    expect(scheduling.calls[1]?.now).toEqual(at(40_000));
    const [record] = persistence.records;
    expect(record?.scheduling.lastReview).toEqual(at(40_000));
    expect(record?.log.reviewedAt).toEqual(at(40_000));
    expect(service.current()?.card.id).toBe('B');
    expect(service.remaining()).toBe(2);
    expect(persistence.pendingCount).toBe(1);

    persistence.resolveNext();
    await flush();
    expect(persistence.pendingCount).toBe(0);
  });
});

describe('ReviewSessionService · rechazo tardío, fin y salida', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  const failure = new Error('permiso denegado');

  function gradeCurrent(service: ReviewSessionService, rating: 1 | 2 | 3 | 4) {
    service.reveal();
    service.grade(rating);
  }

  it('un rechazo tardío devuelve la tarjeta al final, deshace su cuenta y avisa', async () => {
    const { service, persistence, logger } = setup();
    service.start(prepared());
    gradeCurrent(service, 3);
    expect(service.progress()).toBe(33);

    persistence.rejectNext(failure);
    await flush();

    expect(service.alerts()).toEqual([{ cardId: 'A', front: 'to give up', kind: 'failed' }]);
    expect(service.ratingCounts().good).toBe(0);
    expect(service.progress()).toBe(0);
    expect(service.remaining()).toBe(3);
    expect(logger.entries.at(-1)?.cause).toBe(failure);
  });

  it('un rechazo con el cierre visible se cuenta y el cierre sigue', async () => {
    const { service, persistence } = setup();
    service.start(prepared([A]));
    gradeCurrent(service, 3);
    expect(service.status()).toBe('finished');

    persistence.rejectNext(failure);
    await flush();

    expect(service.rejectedAfterFinish()).toBe(1);
    expect(service.status()).toBe('finished');
  });

  it('al terminar avisa con las difíciles; al salir, también', () => {
    const { service } = setup();
    service.start(prepared([A, B]));
    gradeCurrent(service, 1);
    gradeCurrent(service, 4);
    expect(service.ended()).toEqual({ reason: 'finished', difficult: [A] });

    service.reset();
    service.start(prepared([A, B]));
    gradeCurrent(service, 2);
    service.exit();
    expect(service.ended()).toEqual({ reason: 'exit', difficult: [A] });
  });

  it('salir con un guardado pendiente vacía la sesión; su rechazo posterior solo se registra', async () => {
    const { service, persistence, logger } = setup();
    service.start(prepared());
    gradeCurrent(service, 3);

    service.exit();
    expect(service.status()).toBe('idle');
    persistence.rejectNext(failure);
    await flush();

    expect(service.status()).toBe('idle');
    expect(logger.entries.at(-1)?.cause).toBe(failure);
  });

  it('tras el cierre, "Volver a Hoy" la vacía y la siguiente arranca limpia', async () => {
    const { service, persistence } = setup();
    service.start(prepared([A]));
    gradeCurrent(service, 1);
    service.reset();
    expect(service.status()).toBe('idle');

    service.start(prepared([B, C]));
    // Un rechazo de la sesión anterior no toca la nueva.
    persistence.rejectNext(failure);
    await flush();

    expect(service.ratingCounts()).toEqual({ again: 0, hard: 0, good: 0, easy: 0 });
    expect(service.difficultCards()).toEqual([]);
    expect(service.alerts()).toEqual([]);
    expect(service.distinctCount()).toBe(2);
  });
});

describe('ReviewSessionService · rechazos permanentes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  function gradeCurrent(service: ReviewSessionService, rating: Rating) {
    service.reveal();
    service.grade(rating);
  }

  it('una tarjeta borrada en otro dispositivo sale de la sesión con su aviso, sin volver', async () => {
    const { service, persistence, logger } = setup();
    service.start(prepared());
    gradeCurrent(service, 3);
    const gone = new CardGoneError('A');

    persistence.rejectNext(gone);
    await flush();

    expect(service.alerts()).toEqual([{ cardId: 'A', front: 'to give up', kind: 'gone' }]);
    expect(service.ratingCounts().good).toBe(0);
    expect(service.progress()).toBe(33);
    expect(service.remaining()).toBe(2);
    expect(logger.entries.at(-1)?.cause).toBe(gone);
  });

  it('si la borrada era la única que quedaba, la sesión termina y avisa del final', async () => {
    const { service, scheduling, persistence } = setup();
    scheduling.setPreview(comesBackInAMinute);
    service.start(prepared([A]));
    gradeCurrent(service, 1);
    expect(service.status()).toBe('active');

    persistence.rejectNext(new CardGoneError('A'));
    await flush();

    expect(service.status()).toBe('finished');
    expect(service.ended()).toEqual({ reason: 'finished', difficult: [] });
  });

  it('sin acceso, la sesión se cierra y ya no califica', async () => {
    const { service, persistence, logger } = setup();
    service.start(prepared());
    gradeCurrent(service, 3);
    const revoked = new AccessRevokedError();

    persistence.rejectNext(revoked);
    await flush();
    gradeCurrent(service, 3);

    expect(service.status()).toBe('accessLost');
    expect(persistence.records).toHaveLength(1);
    expect(logger.entries.at(-1)?.cause).toBe(revoked);
  });

  it('al reconocer el aviso, la sesión se vacía y la de la app queda sin acceso', async () => {
    const { service, persistence, session } = setup();
    service.start(prepared());
    gradeCurrent(service, 3);
    persistence.rejectNext(new AccessRevokedError());
    await flush();

    service.acknowledgeLostAccess();

    expect(service.status()).toBe('idle');
    expect(session.state()).toEqual({ kind: 'noAccess', email: aUser().email });
  });
});

describe('ReviewSessionService · avisa que la colección cambió', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('calificar avisa al enviar la nota y otra vez cuando el servidor responde', async () => {
    const { service, persistence } = setup();
    const changes = TestBed.inject(CardCollectionChanges);
    service.start(prepared());
    service.reveal();

    service.grade(3);
    expect(changes.version()).toBe(1);

    persistence.resolveNext();
    await flush();
    expect(changes.version()).toBe(2);
  });

  it('un rechazo también avisa: el conteo siguiente refleja lo que de verdad quedó', async () => {
    const { service, persistence } = setup();
    const changes = TestBed.inject(CardCollectionChanges);
    service.start(prepared());
    service.reveal();

    service.grade(3);
    persistence.rejectNext(new Error('permiso'));
    await flush();

    expect(changes.version()).toBe(2);
  });
});
