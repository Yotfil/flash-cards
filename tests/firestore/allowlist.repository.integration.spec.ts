import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';

import { FirestoreAllowlistRepository } from '@infrastructure/firestore/allowlist.repository.firestore';

import {
  createRulesTestEnvironment,
  modularFirestore,
  ownerContext,
  seedAllowlist,
} from '../support/firestore-test-environment';

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await createRulesTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedAllowlist(environment, ['ada@ejemplo.com', 'Luis@Ejemplo.com']);
});

function repositoryAs(email: string): FirestoreAllowlistRepository {
  return new FirestoreAllowlistRepository(modularFirestore(ownerContext(environment, 'u1', email)));
}

describe('FirestoreAllowlistRepository', () => {
  it('un correo con entrada en la lista está autorizado', async () => {
    expect(await repositoryAs('ada@ejemplo.com').isAllowed('ada@ejemplo.com')).toBe(true);
  });

  it('un correo sin entrada no está autorizado', async () => {
    expect(await repositoryAs('nuevo@ejemplo.com').isAllowed('nuevo@ejemplo.com')).toBe(false);
  });

  it('la comparación es literal: otras mayúsculas no cuentan', async () => {
    expect(await repositoryAs('luis@ejemplo.com').isAllowed('luis@ejemplo.com')).toBe(false);
  });
});
