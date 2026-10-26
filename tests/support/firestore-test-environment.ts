import { readFileSync } from 'node:fs';

import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, type Firestore } from 'firebase/firestore';

// Soporte compartido por las pruebas de integración contra el emulador de Firestore: las reglas
// de seguridad y los adaptadores (escritor por lotes, repositorios). Todas arrancan el mismo
// entorno, siembran la lista de acceso y actúan como el dueño de un árbol de usuario.

// Proyecto de demostración (Firebase trata los `demo-*` como solo-emulador: nunca toca la nube),
// distinto del de desarrollo (`demo-cadence`). Cada prueba vacía su proyecto; el emulador separa los
// datos por proyecto, así que una prueba que llegara al emulador de desarrollo no borraría los suyos.
export const INTEGRATION_PROJECT_ID = 'demo-cadence-test';

export function createRulesTestEnvironment(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: INTEGRATION_PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
}

// La lista de acceso la administra un humano desde la consola (el cliente nunca la escribe), así
// que se siembra con las reglas desactivadas.
export async function seedAllowlist(
  environment: RulesTestEnvironment,
  emails: readonly string[],
): Promise<void> {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const email of emails) {
      await setDoc(doc(db, 'allowlist', email), { addedAt: 'seed' });
    }
  });
}

// Contexto autenticado como un usuario concreto, con el correo que las reglas buscan en la lista.
export function ownerContext(
  environment: RulesTestEnvironment,
  uid: string,
  email: string,
): RulesTestContext {
  return environment.authenticatedContext(uid, { email });
}

// `RulesTestContext.firestore()` devuelve la instancia de la API de compatibilidad; las funciones
// modulares (`doc`, `writeBatch`…) la aceptan porque desenvuelven su delegado, pero su tipo no
// encaja con `Firestore`. Los adaptadores reciben `Firestore`, así que la conversión vive aquí,
// una sola vez.
export function modularFirestore(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}
