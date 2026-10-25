import { increment, type DocumentReference, type Firestore } from 'firebase/firestore';

import {
  BatchCommitError,
  BatchWriter,
  MAX_BATCH_SIZE,
  type BatchCommitResult,
} from './batch-writer';

/**
 * Una escritura del lote y cuánto mueve el contador de tarjetas del libro: +1 un alta, −1 una baja,
 * 0 lo que no es una tarjeta (el capítulo, el libro). Así un mismo lote puede mezclar altas y
 * bajas (reemplazar las tarjetas de un capítulo) con un único ajuste del contador.
 */
export interface CountedOperation {
  readonly apply: (writer: BatchWriter) => void;
  readonly delta: -1 | 0 | 1;
}

/** Operaciones de tarjeta por lote: deja sitio a la suma del libro y a la operación final. */
export const COUNTED_GROUP_SIZE = MAX_BATCH_SIZE - 2;

export interface CountedBatchOptions {
  readonly firestore: Firestore;
  /** El libro cuyo `cardCount` se ajusta. */
  readonly bookRef: DocumentReference;
  readonly operations: readonly CountedOperation[];
  /** Operación que va solo en el último lote (borrar el capítulo, escribir el libro importado). */
  readonly trailing?: CountedOperation;
}

/**
 * Escribe altas y bajas de tarjetas en lotes de hasta 448, cada lote con el ajuste del contador
 * del libro (la suma de los deltas de sus operaciones) en la misma escritura atómica: si un lote
 * falla a mitad, el contador sigue cuadrando con lo que de verdad quedó, y la operación final no
 * llega a escribirse. El error lleva lo ya escrito.
 */
export async function writeInCountedBatches(
  options: CountedBatchOptions,
): Promise<BatchCommitResult> {
  const groups = chunksOf(options.operations, COUNTED_GROUP_SIZE);
  if (groups.length === 0) {
    if (!options.trailing) {
      return { batches: 0, written: [] };
    }
    groups.push([]);
  }

  const written: DocumentReference[] = [];
  let batches = 0;
  for (const [index, group] of groups.entries()) {
    const writer = new BatchWriter(options.firestore);
    const isLast = index === groups.length - 1;
    const inBatch = options.trailing && isLast ? [...group, options.trailing] : group;
    inBatch.forEach((operation) => operation.apply(writer));
    const delta = inBatch.reduce((sum, operation) => sum + operation.delta, 0);
    if (delta !== 0) {
      writer.update(options.bookRef, { cardCount: increment(delta) });
    }
    try {
      written.push(...(await writer.commit()).written);
    } catch (error) {
      throw new BatchCommitError(written, error instanceof BatchCommitError ? error.cause : error);
    }
    batches++;
  }
  return { batches, written };
}

function chunksOf<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}
