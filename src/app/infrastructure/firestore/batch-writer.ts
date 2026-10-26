import {
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type UpdateData,
  type WithFieldValue,
} from 'firebase/firestore';

// Escritor por lotes para las escrituras masivas (crear o borrar muchas tarjetas, importar un
// libro). Un lote de Firestore es atómico pero admite como máximo 500 operaciones; aquí se
// trocea en lotes de 450 para dejar margen y se confirman en secuencia. El conjunto NO es
// atómico: si un lote falla, el error informa qué quedó escrito en los anteriores para que la
// operación que lo pidió decida cómo deshacerlo.

/** Operaciones por lote: margen bajo el límite de 500 del almacén. */
export const MAX_BATCH_SIZE = 450;

type BatchOperation =
  | {
      readonly kind: 'set';
      readonly ref: DocumentReference;
      readonly data: WithFieldValue<DocumentData>;
    }
  | {
      readonly kind: 'update';
      readonly ref: DocumentReference;
      readonly data: UpdateData<DocumentData>;
    }
  | { readonly kind: 'delete'; readonly ref: DocumentReference };

export interface BatchCommitResult {
  /** Cuántos lotes se confirmaron. */
  readonly batches: number;
  /** Los documentos escritos, en el orden en que se añadieron. */
  readonly written: readonly DocumentReference[];
}

export class BatchCommitError extends Error {
  override readonly name = 'BatchCommitError';

  constructor(
    /** Lo confirmado en los lotes anteriores al que falló (lo que habría que deshacer). */
    readonly committed: readonly DocumentReference[],
    cause: unknown,
  ) {
    super(`Falló un lote tras escribir ${committed.length} documentos`, { cause });
  }
}

export class BatchWriter {
  private readonly operations: BatchOperation[] = [];

  constructor(private readonly firestore: Firestore) {}

  set(ref: DocumentReference, data: WithFieldValue<DocumentData>): void {
    this.operations.push({ kind: 'set', ref, data });
  }

  update(ref: DocumentReference, data: UpdateData<DocumentData>): void {
    this.operations.push({ kind: 'update', ref, data });
  }

  delete(ref: DocumentReference): void {
    this.operations.push({ kind: 'delete', ref });
  }

  /** Confirma las operaciones en lotes consecutivos, respetando el orden en que se añadieron. */
  async commit(): Promise<BatchCommitResult> {
    const written: DocumentReference[] = [];
    let batches = 0;
    for (const chunk of chunksOf(this.operations, MAX_BATCH_SIZE)) {
      try {
        await this.commitChunk(chunk);
      } catch (error) {
        throw new BatchCommitError(written, error);
      }
      written.push(...chunk.map((operation) => operation.ref));
      batches++;
    }
    return { batches, written };
  }

  private async commitChunk(chunk: readonly BatchOperation[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    for (const operation of chunk) {
      if (operation.kind === 'set') {
        batch.set(operation.ref, operation.data);
      } else if (operation.kind === 'update') {
        batch.update(operation.ref, operation.data);
      } else {
        batch.delete(operation.ref);
      }
    }
    await batch.commit();
  }
}

/** Parte una lista en trozos de `size` (el último, con lo que quede). */
export function chunksOf<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}
