import {
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';

import type { ReadSource } from '@domain/ports/read-source';

import { hasFirestoreCode } from './firestore-error-code';

/**
 * Ejecuta una consulta en el origen pedido. `'device'` lee solo la caché local (sin red; vacía si
 * la consulta nunca trajo nada); `'server'` va al servidor y, sin red, cae a la caché.
 */
export function readFrom<AppModel, DbModel extends DocumentData>(
  query: Query<AppModel, DbModel>,
  source: ReadSource,
): Promise<QuerySnapshot<AppModel, DbModel>> {
  return source === 'device' ? getDocsFromCache(query) : getDocs(query);
}

/**
 * Lee un documento en el origen pedido. Con `'device'`, `null` si el dispositivo no lo tiene
 * guardado (la caché responde `unavailable`): no es un fallo, es que nunca se leyó aquí. Si la
 * caché sabe que el documento no existe, devuelve esa instantánea (`exists()` es falso).
 */
export async function readDocFrom<AppModel, DbModel extends DocumentData>(
  ref: DocumentReference<AppModel, DbModel>,
  source: ReadSource,
): Promise<DocumentSnapshot<AppModel, DbModel> | null> {
  if (source === 'server') {
    return getDoc(ref);
  }
  try {
    return await getDocFromCache(ref);
  } catch (error) {
    if (hasFirestoreCode(error, 'unavailable')) {
      return null;
    }
    throw error;
  }
}
