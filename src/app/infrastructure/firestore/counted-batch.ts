import {
  increment,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type WithFieldValue,
} from 'firebase/firestore';

import {
  BatchCommitError,
  BatchWriter,
  MAX_BATCH_SIZE,
  type BatchCommitResult,
} from './batch-writer';

export type CountedOperation =
  | {
      readonly kind: 'set';
      readonly ref: DocumentReference;
      readonly data: WithFieldValue<DocumentData>;
    }
  | { readonly kind: 'delete'; readonly ref: DocumentReference };

/** Operaciones de tarjeta por lote: deja sitio a la suma del libro y a la operación final. */
export const COUNTED_GROUP_SIZE = MAX_BATCH_SIZE - 2;

export interface CountedBatchOptions {
  readonly firestore: Firestore;
  /** El libro cuyo `cardCount` se ajusta. */
  readonly bookRef: DocumentReference;
  /** Altas o bajas de tarjetas, cada una vale `delta` en el contador. */
  readonly operations: readonly CountedOperation[];
  /** +1 por alta o -1 por baja. */
  readonly delta: number;
  /** Operación que va solo en el último lote (borrar el capítulo, escribir el libro importado). */
  readonly trailing?: CountedOperation;
}

/**
 * Escribe altas o bajas de tarjetas en lotes de hasta 448, cada lote con su ajuste del contador del
 * libro en la misma escritura atómica: si un lote falla a mitad, el contador sigue cuadrando con lo
 * que de verdad quedó, y la operación final no llega a escribirse. El error lleva lo ya escrito.
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
    group.forEach((operation) => addTo(writer, operation));
    if (group.length > 0) {
      writer.update(options.bookRef, { cardCount: increment(options.delta * group.length) });
    }
    if (options.trailing && index === groups.length - 1) {
      addTo(writer, options.trailing);
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

function addTo(writer: BatchWriter, operation: CountedOperation): void {
  if (operation.kind === 'set') {
    writer.set(operation.ref, operation.data);
  } else {
    writer.delete(operation.ref);
  }
}

function chunksOf<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}
