import {
  getDocs,
  getDocsFromCache,
  type DocumentData,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';

import type { ReadSource } from '@domain/ports/read-source';

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
