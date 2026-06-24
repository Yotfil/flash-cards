// Lógica de negocio de los libros: orquesta el puerto BookRepository y la sesión (AuthService) y
// expone el estado de la biblioteca como signals para que la UI lo consuma. No conoce Firestore.
// El `uid` se resuelve aquí (desde la sesión), no en los componentes.

import { Injectable, inject, signal } from '@angular/core';

import { BookRepository } from '@domain/ports';
import type { Book, BookDraft } from '@domain/models';
import { AuthService } from './auth.service';

/** Valores por defecto de un libro nuevo (espec. §6.4). Reutilizables por el formulario. El default
 *  de tarjetas nuevas vive en el dominio (fuente única, también seed del perfil) y se re-exporta aquí
 *  para no romper los imports existentes desde `@services/books.service`. */
export { DEFAULT_NEW_CARDS_PER_DAY } from '@domain/models';
export const DEFAULT_MAX_REVIEWS_PER_DAY = 200;

/** Estado de carga de la biblioteca, para que la UI elija qué pintar (skeleton/error/lista). */
export type BooksStatus = 'idle' | 'loading' | 'ready' | 'error';

@Injectable({ providedIn: 'root' })
export class BooksService {
  private readonly bookRepository = inject(BookRepository);
  private readonly authService = inject(AuthService);

  private readonly booksSignal = signal<Book[]>([]);
  private readonly statusSignal = signal<BooksStatus>('idle');
  private readonly errorMessageSignal = signal<string | null>(null);

  readonly books = this.booksSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly errorMessage = this.errorMessageSignal.asReadonly();

  /** Carga los libros sólo si aún no se han cargado. Útil para vistas (p. ej. el detalle de un
   *  libro) a las que se puede llegar por navegación directa sin pasar por la lista. */
  async ensureLoaded(): Promise<void> {
    if (this.statusSignal() === 'idle') {
      await this.load();
    }
  }

  /** Carga los libros del usuario actual. Maneja el error de forma visible (contrato). */
  async load(): Promise<void> {
    this.statusSignal.set('loading');
    this.errorMessageSignal.set(null);
    try {
      const uid = this.requireUid();
      this.booksSignal.set(await this.bookRepository.listByUser(uid));
      this.statusSignal.set('ready');
    } catch (error) {
      this.fail('No se pudieron cargar tus libros.', error);
    }
  }

  /** Crea un libro al final de la biblioteca (orden = máximo actual + 1) y lo añade a la lista. */
  async create(draft: BookDraft): Promise<void> {
    const uid = this.requireUid();
    const order = this.nextOrder();
    const created = await this.bookRepository.create(uid, { ...draft, order });
    this.booksSignal.update((books) => [...books, created]);
  }

  /** Aplica cambios a un libro existente y refleja el cambio en la lista local. */
  async update(bookId: string, changes: Partial<BookDraft>): Promise<void> {
    const uid = this.requireUid();
    await this.bookRepository.update(uid, bookId, changes);
    this.booksSignal.update((books) =>
      books.map((book) =>
        book.id === bookId ? { ...book, ...changes, updatedAt: new Date() } : book,
      ),
    );
  }

  /** Borra un libro y lo quita de la lista local. */
  async remove(bookId: string): Promise<void> {
    const uid = this.requireUid();
    await this.bookRepository.delete(uid, bookId);
    this.booksSignal.update((books) => books.filter((book) => book.id !== bookId));
  }

  /** Ajusta el conteo de tarjetas de un libro (+1/-1): lo persiste y refresca el signal local para
   *  que la Biblioteca muestre el conteo correcto sin recargar. La llaman los servicios de tarjetas
   *  al crear/borrar. */
  async changeCardCount(bookId: string, delta: number): Promise<void> {
    const uid = this.requireUid();
    await this.bookRepository.incrementCardCount(uid, bookId, delta);
    this.booksSignal.update((books) =>
      books.map((book) =>
        book.id === bookId ? { ...book, cardCount: (book.cardCount ?? 0) + delta } : book,
      ),
    );
  }

  /** Añade un libro ya creado (p. ej. por importación) a la lista local, para que la Biblioteca lo
   *  muestre sin recargar. Si la lista aún no se ha cargado, no hace nada (la carga inicial lo traerá). */
  addLocal(book: Book): void {
    if (this.statusSignal() === 'ready') {
      this.booksSignal.update((books) => [...books, book]);
    }
  }

  /** Siguiente orden disponible para un libro nuevo (máximo actual + 1). */
  nextBookOrder(): number {
    return this.nextOrder();
  }

  private nextOrder(): number {
    const orders = this.booksSignal().map((book) => book.order);
    return orders.length === 0 ? 0 : Math.max(...orders) + 1;
  }

  /** El uid de la sesión actual; sin sesión es un error explícito (no debería pasar tras el guard). */
  private requireUid(): string {
    const uid = this.authService.currentUser()?.id;
    if (!uid) {
      throw new Error('No hay una sesión activa para operar sobre los libros.');
    }
    return uid;
  }

  private fail(message: string, error: unknown): void {
    console.error(message, error);
    this.errorMessageSignal.set(message);
    this.statusSignal.set('error');
  }
}
