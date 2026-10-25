import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

import {
  firestoreTimestamp,
  InvalidDocumentError,
  parseDocument,
  parseDocuments,
} from './document-boundary';

// Esquema de ejemplo, materia-agnóstico: lo que importa es el mecanismo, no el documento concreto
// (cada capacidad trae su propio esquema y lo prueba con sus campos).
const noteSchema = z.object({
  title: z.string(),
  createdAt: firestoreTimestamp,
  views: z.number().default(0),
});

const CREATED_AT = new Date('2026-06-15T10:30:00.000Z');

function plainDocument(id: string, data: unknown) {
  return { id, path: `users/u1/notes/${id}`, data: () => data };
}

describe('frontera de lectura de documentos', () => {
  it('convierte la marca de tiempo del almacén en una fecha', () => {
    const note = parseDocument(noteSchema, 'users/u1/notes/n1', {
      title: 'Primera',
      createdAt: Timestamp.fromDate(CREATED_AT),
      views: 3,
    });

    expect(note.createdAt).toBeInstanceOf(Date);
    expect(note.createdAt.toISOString()).toBe('2026-06-15T10:30:00.000Z');
  });

  it('rechaza un campo con tipo incorrecto con un error que nombra la ruta y el campo', () => {
    const read = () =>
      parseDocument(noteSchema, 'users/u1/notes/n1', {
        title: 42,
        createdAt: Timestamp.fromDate(CREATED_AT),
      });

    expect(read).toThrow(InvalidDocumentError);
    try {
      read();
    } catch (error) {
      const invalid = error as InvalidDocumentError;
      expect(invalid.path).toBe('users/u1/notes/n1');
      expect(invalid.issues.map((issue) => issue.field)).toEqual(['title']);
      expect(invalid.message).toContain('users/u1/notes/n1');
      expect(invalid.message).toContain('title');
    }
  });

  it('un listado con un documento inválido falla entero, sin devolver los válidos', () => {
    const documents = [
      plainDocument('n1', { title: 'Uno', createdAt: Timestamp.fromDate(CREATED_AT) }),
      plainDocument('n2', { title: 'Dos', createdAt: 'ayer' }),
      plainDocument('n3', { title: 'Tres', createdAt: Timestamp.fromDate(CREATED_AT) }),
    ];

    expect(() => parseDocuments(noteSchema, documents)).toThrow(
      expect.objectContaining({ name: 'InvalidDocumentError', path: 'users/u1/notes/n2' }),
    );
  });

  it('un listado válido devuelve cada modelo con su identificador', () => {
    const documents = [
      plainDocument('n1', { title: 'Uno', createdAt: Timestamp.fromDate(CREATED_AT) }),
      plainDocument('n2', { title: 'Dos', createdAt: Timestamp.fromDate(CREATED_AT), views: 7 }),
    ];

    const notes = parseDocuments(noteSchema, documents);

    expect(notes).toEqual([
      { id: 'n1', title: 'Uno', createdAt: CREATED_AT, views: 0 },
      { id: 'n2', title: 'Dos', createdAt: CREATED_AT, views: 7 },
    ]);
  });

  it('completa con su valor por defecto un campo añadido después del lanzamiento', () => {
    const note = parseDocument(noteSchema, 'users/u1/notes/viejo', {
      title: 'Documento anterior al campo',
      createdAt: Timestamp.fromDate(CREATED_AT),
    });

    expect(note.views).toBe(0);
  });
});
