import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

import {
  createRulesTestEnvironment,
  ownerContext,
  seedAllowlist,
} from '../support/firestore-test-environment';

// La lista de acceso se consulta por correo exacto, con o sin sesión (para comprobar antes de
// registrarse), pero nunca se lista ni se escribe desde el cliente.

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await createRulesTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedAllowlist(environment, ['ada@ejemplo.com']);
});

describe('reglas de /allowlist', () => {
  it('sin sesión se comprueba un correo exacto, exista o no', async () => {
    const db = environment.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(db, 'allowlist', 'ada@ejemplo.com')));
    await assertSucceeds(getDoc(doc(db, 'allowlist', 'nuevo@ejemplo.com')));
  });

  it('con sesión se comprueba la entrada de otro correo', async () => {
    const db = ownerContext(environment, 'u2', 'luis@ejemplo.com').firestore();

    await assertSucceeds(getDoc(doc(db, 'allowlist', 'ada@ejemplo.com')));
  });

  it('nadie lista la colección, con o sin sesión', async () => {
    const anonymous = environment.unauthenticatedContext().firestore();
    const signedIn = ownerContext(environment, 'u1', 'ada@ejemplo.com').firestore();

    await assertFails(getDocs(collection(anonymous, 'allowlist')));
    await assertFails(getDocs(collection(signedIn, 'allowlist')));
  });

  it('nadie se autoriza escribiendo en la lista', async () => {
    const db = ownerContext(environment, 'u2', 'luis@ejemplo.com').firestore();

    await assertFails(setDoc(doc(db, 'allowlist', 'luis@ejemplo.com'), { addedAt: 'yo' }));
    await assertFails(updateDoc(doc(db, 'allowlist', 'ada@ejemplo.com'), { addedAt: 'yo' }));
  });
});
