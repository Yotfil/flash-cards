import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, type Firestore } from 'firebase/firestore';

import { FirestoreDailyStatsRepository } from '@infrastructure/firestore/daily-stats.repository.firestore';
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
let repository: FirestoreDailyStatsRepository;

beforeAll(async () => {
  environment = await createRulesTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedAllowlist(environment, [OWNER_EMAIL]);
  repository = new FirestoreDailyStatsRepository(
    modularFirestore(ownerContext(environment, OWNER_UID, OWNER_EMAIL)),
  );
});

async function asAdmin(work: (db: Firestore) => Promise<void>): Promise<void> {
  await environment.withSecurityRulesDisabled((context) => work(modularFirestore(context)));
}

const seedDay = (date: string, data: Record<string, unknown> = {}) =>
  asAdmin((db) => setDoc(doc(db, 'users', OWNER_UID, 'dailyStats', date), { date, ...data }));

describe('FirestoreDailyStatsRepository', () => {
  it('un día sin actividad no tiene indicadores', async () => {
    expect(await repository.getByDay(OWNER_UID, '2026-10-24')).toBeNull();
  });

  it('lee los indicadores de un día con sus contadores', async () => {
    await seedDay('2026-10-24', {
      newCardsIntroduced: { b1: 3 },
      reviewsCompleted: 5,
      ratingCounts: { again: 1, good: 4 },
    });

    expect(await repository.getByDay(OWNER_UID, '2026-10-24')).toEqual({
      id: '2026-10-24',
      date: '2026-10-24',
      newCardsIntroduced: { b1: 3 },
      reviewsCompleted: 5,
      reviewsCompletedByBook: {},
      ratingCounts: { again: 1, hard: 0, good: 4, easy: 0 },
    });
  });

  it('los recientes llegan del más nuevo al más viejo, hasta el límite', async () => {
    for (const date of ['2026-10-20', '2026-10-22', '2026-10-24', '2026-10-21', '2026-10-23']) {
      await seedDay(date, { reviewsCompleted: 1 });
    }

    const recent = await repository.listRecent(OWNER_UID, 3);

    expect(recent.map((day) => day.date)).toEqual(['2026-10-24', '2026-10-23', '2026-10-22']);
  });

  it('un documento corrupto falla con un error que nombra su ruta', async () => {
    await asAdmin((db) =>
      setDoc(doc(db, 'users', OWNER_UID, 'dailyStats', '2026-10-24'), { reviewsCompleted: 'x' }),
    );

    const failure = await repository
      .getByDay(OWNER_UID, '2026-10-24')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(InvalidDocumentError);
    expect((failure as InvalidDocumentError).message).toContain('users/u1/dailyStats/2026-10-24');
  });
});
