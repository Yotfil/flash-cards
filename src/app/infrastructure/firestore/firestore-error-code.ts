import type { FirestoreErrorCode } from 'firebase/firestore';

/**
 * ¿Es un error de Firestore con ese código? Se mira `code` y no la clase: el SDK puede llegar en
 * más de una copia (la API de compatibilidad de las pruebas trae la suya) y `instanceof` fallaría.
 */
export function hasFirestoreCode(error: unknown, code: FirestoreErrorCode): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
