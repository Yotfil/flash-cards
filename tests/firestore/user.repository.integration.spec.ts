import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, setDoc } from 'firebase/firestore';

import type { User } from '@domain/models/user.model';
import { InvalidDocumentError } from '@infrastructure/firestore/document-boundary';
import { FirestoreUserRepository } from '@infrastructure/firestore/user.repository.firestore';

import {
  createRulesTestEnvironment,
  modularFirestore,
  ownerContext,
  seedAllowlist,
} from '../support/firestore-test-environment';

const OWNER_UID = 'u1';
const OWNER_EMAIL = 'ada@ejemplo.com';

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await createRulesTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedAllowlist(environment, [OWNER_EMAIL, 'luis@ejemplo.com']);
});

function repositoryAs(uid: string, email: string): FirestoreUserRepository {
  return new FirestoreUserRepository(modularFirestore(ownerContext(environment, uid, email)));
}

async function seedProfile(uid: string, data: Record<string, unknown>): Promise<void> {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(modularFirestore(context), 'users', uid), data);
  });
}

const PROFILE: User = {
  id: OWNER_UID,
  displayName: 'Ada',
  email: OWNER_EMAIL,
  createdAt: new Date('2026-06-15T10:30:00.000Z'),
  photoURL: 'https://foto.example/ada.png',
  isSearchable: false,
  settings: {
    timezone: 'America/Bogota',
    dayStartHour: 4,
    theme: 'system',
    defaultNewCardsPerDay: 15,
    autoGradeByTime: false,
    practicePackageCapacity: 12,
    promptTemplate: 'Mi plantilla: [[REPASADAS]] / [[DIFICILES]]',
  },
};

describe('FirestoreUserRepository', () => {
  it('guarda el perfil y lo lee igual, con la fecha como Date', async () => {
    const repository = repositoryAs(OWNER_UID, OWNER_EMAIL);

    await repository.save(PROFILE);
    const read = await repository.findById(OWNER_UID);

    expect(read).toEqual(PROFILE);
    expect(read?.createdAt).toBeInstanceOf(Date);
  });

  it('un perfil antiguo sin los ajustes añadidos después se lee con sus valores por defecto', async () => {
    await seedProfile(OWNER_UID, {
      displayName: 'Ada',
      email: OWNER_EMAIL,
      createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
      isSearchable: false,
      settings: { timezone: 'America/Bogota', dayStartHour: 4, theme: 'dark' },
    });

    const read = await repositoryAs(OWNER_UID, OWNER_EMAIL).findById(OWNER_UID);

    expect(read?.settings.defaultNewCardsPerDay).toBe(20);
    expect(read?.settings.autoGradeByTime).toBe(true);
    expect(read?.settings.practicePackageCapacity).toBe(20);
    expect(read?.settings).not.toHaveProperty('promptTemplate');
    expect(read?.settings.theme).toBe('dark');
  });

  it('un perfil sin nombre falla con un error que nombra su ruta', async () => {
    await seedProfile(OWNER_UID, {
      email: OWNER_EMAIL,
      createdAt: Timestamp.now(),
      isSearchable: false,
      settings: { timezone: 'UTC', dayStartHour: 4, theme: 'system' },
    });

    const failure = await repositoryAs(OWNER_UID, OWNER_EMAIL)
      .findById(OWNER_UID)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(InvalidDocumentError);
    expect((failure as InvalidDocumentError).path).toBe('users/u1');
  });

  it('un perfil que todavía no existe se lee como null', async () => {
    expect(await repositoryAs('u2', 'luis@ejemplo.com').findById('u2')).toBeNull();
  });
});
