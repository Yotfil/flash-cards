import type { Book } from '@domain/models/book.model';
import { ImportRepository, type ImportBookInput } from '@domain/ports/import.repository';

// Fake de la importación de libros: guarda la última entrada y devuelve el libro creado, o lanza
// lo que la prueba ponga en `failWith`. `calls` cuenta las llamadas; `gate` permite retenerla.
export class FakeImportRepository extends ImportRepository {
  lastInput: ImportBookInput | null = null;
  failWith: unknown = null;
  calls = 0;
  /** Si existe, la importación espera a que se cumpla (para probar el estado "Importando…"). */
  gate: Promise<void> | null = null;

  async importBook(_uid: string, input: ImportBookInput): Promise<Book> {
    this.calls++;
    this.lastInput = input;
    if (this.gate) {
      await this.gate;
    }
    if (this.failWith) {
      throw this.failWith;
    }
    const now = new Date();
    return { id: `importado-${this.calls}`, ...input.book, createdAt: now, updatedAt: now };
  }
}
