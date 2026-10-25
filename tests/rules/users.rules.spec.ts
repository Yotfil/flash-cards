import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import {
  createRulesTestEnvironment,
  ownerContext,
  seedAllowlist,
} from '../support/firestore-test-environment';

// Prueba de las reglas de seguridad vigentes (firestore.rules) contra el emulador.
// Lo que protege los datos: cada usuario solo accede a su propio árbol, y solo si su correo
// está en la lista de acceso. El historial de repasos es solo de añadido.

const OWNER_UID = 'u1';
const OWNER_EMAIL = 'ana@example.com';
const OTHER_UID = 'u2';
const OTHER_EMAIL = 'luis@example.com';

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await createRulesTestEnvironment();
});

afterAll(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  // Datos semilla escritos sin reglas: la lista de acceso (que el cliente nunca escribe), un
  // libro del dueño y un registro de repaso.
  await seedAllowlist(environment, [OWNER_EMAIL, OTHER_EMAIL]);
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', OWNER_UID, 'books', 'b1'), { name: 'Phrasal Verbs' });
    await setDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log1'), { rating: 3 });
  });
});

describe('reglas de /users/{uid}', () => {
  it('sin sesión no se lee el libro de un usuario', async () => {
    const db = environment.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(db, 'users', OWNER_UID, 'books', 'b1')));
  });

  it('sin sesión no se escribe en el árbol de un usuario', async () => {
    const db = environment.unauthenticatedContext().firestore();

    await assertFails(setDoc(doc(db, 'users', OWNER_UID, 'books', 'b2'), { name: 'Intruso' }));
  });

  it('el dueño escribe en cada colección declarada de su árbol', async () => {
    const db = ownerContext(environment, OWNER_UID, OWNER_EMAIL).firestore();

    await assertSucceeds(setDoc(doc(db, 'users', OWNER_UID, 'books', 'b2'), { name: 'Libro' }));
    await assertSucceeds(
      setDoc(doc(db, 'users', OWNER_UID, 'chapters', 'ch1'), { bookId: 'b2', name: 'Uno' }),
    );
    await assertSucceeds(
      setDoc(doc(db, 'users', OWNER_UID, 'cards', 'c1'), { front: 'anverso', back: 'reverso' }),
    );
    await assertSucceeds(
      setDoc(doc(db, 'users', OWNER_UID, 'dailyStats', '2026-06-15'), { reviewsCompleted: 1 }),
    );
    await assertSucceeds(setDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log2'), { rating: 3 }));
  });

  it('los paquetes de práctica son del dueño: él los escribe y otro usuario no los lee', async () => {
    const owner = ownerContext(environment, OWNER_UID, OWNER_EMAIL).firestore();
    const other = ownerContext(environment, OTHER_UID, OTHER_EMAIL).firestore();

    await assertSucceeds(
      setDoc(doc(owner, 'users', OWNER_UID, 'practicePackages', 'p1'), { name: 'Película' }),
    );
    await assertFails(getDoc(doc(other, 'users', OWNER_UID, 'practicePackages', 'p1')));
    await assertFails(
      setDoc(doc(other, 'users', OWNER_UID, 'practicePackages', 'p2'), { name: 'Intruso' }),
    );
  });

  it('el dueño no escribe en una colección que las reglas no declaran', async () => {
    const db = ownerContext(environment, OWNER_UID, OWNER_EMAIL).firestore();

    await assertFails(setDoc(doc(db, 'users', OWNER_UID, 'inventada', 'x'), { valor: 1 }));
  });

  it('el dueño con su correo en la lista de acceso lee y escribe su árbol', async () => {
    const db = ownerContext(environment, OWNER_UID, OWNER_EMAIL).firestore();

    await assertSucceeds(getDoc(doc(db, 'users', OWNER_UID, 'books', 'b1')));
    await assertSucceeds(setDoc(doc(db, 'users', OWNER_UID, 'books', 'b2'), { name: 'Nuevo' }));
  });

  it('otro usuario autorizado no lee el árbol ajeno', async () => {
    const db = ownerContext(environment, OTHER_UID, OTHER_EMAIL).firestore();

    await assertFails(getDoc(doc(db, 'users', OWNER_UID, 'books', 'b1')));
  });

  it('el dueño sin correo en la lista de acceso no lee ni su propio árbol', async () => {
    const db = ownerContext(environment, OWNER_UID, 'nadie@example.com').firestore();

    await assertFails(getDoc(doc(db, 'users', OWNER_UID, 'books', 'b1')));
  });

  it('el historial de repasos se crea y se lee, pero no se modifica', async () => {
    const db = ownerContext(environment, OWNER_UID, OWNER_EMAIL).firestore();

    await assertSucceeds(setDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log2'), { rating: 1 }));
    await assertSucceeds(getDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log1')));
    await assertFails(updateDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log1'), { rating: 4 }));
  });

  it('el dueño no borra un registro de repaso', async () => {
    const db = ownerContext(environment, OWNER_UID, OWNER_EMAIL).firestore();

    await assertFails(deleteDoc(doc(db, 'users', OWNER_UID, 'reviewLogs', 'log1')));
  });
});
