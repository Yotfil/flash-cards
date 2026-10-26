import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

// Frontera de lectura: todo documento que llega de Firestore pasa por aquí ANTES de convertirse
// en un modelo de la app. Un documento que no cumple su esquema hace fallar la lectura entera con
// un error que dice qué documento y qué campo; nunca se entrega un modelo a medio formar ni se
// omite un documento en silencio.
//
// El registro del error en el Logger lo hace quien lo captura (el servicio o el ErrorHandler
// global), no la frontera: así sigue siendo pura y se prueba sin inyección.

/** Marca de tiempo de Firestore convertida en `Date`. La reutilizan todos los esquemas. */
export const firestoreTimestamp = z.instanceof(Timestamp).transform((value) => value.toDate());

/** Un campo rechazado: dónde está dentro del documento y qué esperaba el esquema. */
export interface DocumentIssue {
  readonly field: string;
  readonly reason: string;
}

export class InvalidDocumentError extends Error {
  override readonly name = 'InvalidDocumentError';

  constructor(
    readonly path: string,
    readonly issues: readonly DocumentIssue[],
  ) {
    super(`Documento inválido en ${path}: ${describeIssues(issues)}`);
  }
}

/**
 * Forma mínima de un documento leído. Coincide con `QueryDocumentSnapshot` de Firestore (la ruta
 * vive en `ref.path`) y con un objeto plano, para que las pruebas no necesiten el emulador.
 */
export interface FirestoreDocumentLike {
  readonly id: string;
  readonly ref: { readonly path: string };
  data(): unknown;
}

/** Valida un documento y devuelve el modelo, o lanza `InvalidDocumentError`. */
export function parseDocument<Schema extends z.ZodType>(
  schema: Schema,
  path: string,
  data: unknown,
): z.output<Schema> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new InvalidDocumentError(path, toDocumentIssues(result.error));
  }
  return result.data;
}

/**
 * Valida un listado completo: devuelve cada modelo con el identificador de su documento, o lanza
 * en el primer documento inválido (todo o nada: una lista sin el inválido escondería el problema).
 */
export function parseDocuments<Schema extends z.ZodType<object>>(
  schema: Schema,
  documents: readonly FirestoreDocumentLike[],
): (z.output<Schema> & { readonly id: string })[] {
  return documents.map((document) => ({
    id: document.id,
    ...parseDocument(schema, document.ref.path, document.data()),
  }));
}

function toDocumentIssues(error: z.ZodError): DocumentIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.map(String).join('.') : '(documento)',
    reason: issue.message,
  }));
}

function describeIssues(issues: readonly DocumentIssue[]): string {
  return issues.map((issue) => `${issue.field} (${issue.reason})`).join('; ');
}
