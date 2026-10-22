import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Prueba de las reglas de seguridad vigentes (firestore.rules) contra el emulador.
// Lo que protege los datos: cada usuario solo accede a su propio árbol, y solo si su correo
// está en la lista de acceso. El historial de repasos es solo de añadido.

const OWNER_UID = 'u1';
const OWNER_EMAIL = 'ana@example.com';
const OTHER_UID = 'u2';
const OTHER_EMAIL = 'luis@example.com';

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-cadence',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  // Datos semilla escritos sin reglas: la lista de acceso (que el cliente nunca escribe) y un
  // libro del dueño.
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'allowlist', OWNER_EMAIL), { addedAt: 'seed' });
    await setDoc(doc(db, 'allowlist', OTHER_EMAIL), { addedAt: 'seed' });
    await setDoc(doc(db, 'users', OWNER_UID, 'books', 'b1'), { name: 'Phrasal Verbs' });
    await setDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log1'), { rating: 3 });
  });
});

describe('reglas de /users/{uid}', () => {
  it('sin sesión no se lee el libro de un usuario', async () => {
    const db = environment.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(db, 'users', OWNER_UID, 'books', 'b1')));
  });

  it('el dueño con su correo en la lista de acceso lee y escribe su árbol', async () => {
    const db = environment.authenticatedContext(OWNER_UID, { email: OWNER_EMAIL }).firestore();

    await assertSucceeds(getDoc(doc(db, 'users', OWNER_UID, 'books', 'b1')));
    await assertSucceeds(setDoc(doc(db, 'users', OWNER_UID, 'books', 'b2'), { name: 'Nuevo' }));
  });

  it('otro usuario autorizado no lee el árbol ajeno', async () => {
    const db = environment.authenticatedContext(OTHER_UID, { email: OTHER_EMAIL }).firestore();

    await assertFails(getDoc(doc(db, 'users', OWNER_UID, 'books', 'b1')));
  });

  it('el dueño sin correo en la lista de acceso no lee ni su propio árbol', async () => {
    const db = environment
      .authenticatedContext(OWNER_UID, { email: 'nadie@example.com' })
      .firestore();

    await assertFails(getDoc(doc(db, 'users', OWNER_UID, 'books', 'b1')));
  });

  it('el historial de repasos se crea y se lee, pero no se modifica', async () => {
    const db = environment.authenticatedContext(OWNER_UID, { email: OWNER_EMAIL }).firestore();

    await assertSucceeds(setDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log2'), { rating: 1 }));
    await assertSucceeds(getDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log1')));
    await assertFails(updateDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log1'), { rating: 4 }));
  });
});
