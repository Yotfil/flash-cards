import { Injectable, inject, resource, signal, type ResourceRef, type Signal } from '@angular/core';

import type { Book, BookContents, BookDraft, CardStateTotals } from '@domain/models/book.model';
import { DEFAULT_MAX_REVIEWS_PER_DAY } from '@domain/models/study-defaults';
import { BookRepository } from '@domain/ports/book.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { requireSessionUid, requireSessionUser } from '@services/session/require-session';
import { SessionService } from '@services/session/session.service';

/** Sin sesión el recurso se pide igual, para que falle con un error explícito. */
const NO_SESSION = '';
const DEFAULT_SUBJECT = 'general';

/** Lo que el formulario del libro decide: su identidad. */
export interface BookIdentity {
  name: string;
  subject: string;
}

// Libros del usuario. La lista es un recurso de Angular (cargando / error / valor) que la
// Biblioteca relee cada vez que se abre; las mutaciones actualizan la lista local tras el éxito en
// el almacén, sin volver a leerla. Los mensajes para el usuario los elige la pantalla.
@Injectable({ providedIn: 'root' })
export class BooksService {
  private readonly repository = inject(BookRepository);
  private readonly session = inject(SessionService);
  private readonly connectivity = inject(ConnectivityPort);

  /** El recurso no lee nada hasta que alguien lo pide (`reload` o `ensureLoaded`). */
  private readonly loadRequested = signal(false);
  /** Última lectura en curso o terminada, por usuario: `ensureLoaded` y el recurso la comparten. */
  private lastLoad: { uid: string; promise: Promise<Book[]> } | null = null;

  readonly books = resource({
    // Solo el uid (un texto): cambiar ajustes del perfil no relee los libros; cambiar de usuario sí.
    params: () => (this.loadRequested() ? (this.session.user()?.id ?? NO_SESSION) : undefined),
    loader: () => this.load(),
  });

  /** Vuelve a leer la lista (la Biblioteca lo hace cada vez que se abre). */
  reload(): void {
    this.lastLoad = null;
    if (this.loadRequested()) {
      this.books.reload();
    } else {
      this.loadRequested.set(true);
    }
  }

  /**
   * Vuelve a leer la lista y la entrega recién leída, no la que había en memoria (que no sabe de un
   * libro creado en otro dispositivo). El recurso comparte esa misma lectura.
   */
  loadFresh(): Promise<readonly Book[]> {
    this.reload();
    return this.load();
  }

  /** Carga la lista solo si todavía no se pidió (navegación directa al detalle) y la entrega. */
  async ensureLoaded(): Promise<readonly Book[]> {
    if (this.books.hasValue()) {
      return this.books.value();
    }
    this.loadRequested.set(true);
    return this.load();
  }

  /** `undefined` mientras la lista no está lista, `null` si el libro no existe. */
  findById(bookId: string): Book | null | undefined {
    if (!this.books.hasValue()) {
      return undefined;
    }
    return this.books.value().find((book) => book.id === bookId) ?? null;
  }

  /**
   * Crea un libro al final de la Biblioteca: "anverso → reverso", la tanda de nuevas del perfil y
   * el tope de repasos por defecto.
   */
  async create(identity: BookIdentity): Promise<Book> {
    const user = requireSessionUser(this.session.user());
    const book = await this.repository.create(user.id, {
      ...normalizeIdentity(identity),
      studyDirection: 'forward',
      newCardsPerDay: user.settings.defaultNewCardsPerDay,
      maxReviewsPerDay: DEFAULT_MAX_REVIEWS_PER_DAY,
      order: this.nextOrder(),
    });
    this.books.update((books) => [...(books ?? []), book]);
    return book;
  }

  /** Cambia solo lo indicado (identidad o topes); la dirección de estudio nunca se toca aquí. */
  async update(bookId: string, changes: Partial<Omit<BookDraft, 'studyDirection'>>): Promise<Book> {
    const uid = requireSessionUid(this.session.user());
    const normalized = {
      ...changes,
      ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
      ...(changes.subject !== undefined ? { subject: normalizeSubject(changes.subject) } : {}),
    };
    await this.repository.update(uid, bookId, normalized);
    let updated: Book | undefined;
    this.books.update((books) =>
      books?.map((book) => {
        if (book.id !== bookId) {
          return book;
        }
        updated = { ...book, ...normalized, updatedAt: new Date() };
        return updated;
      }),
    );
    if (!updated) {
      throw new Error(`El libro ${bookId} no está en la Biblioteca cargada.`);
    }
    return updated;
  }

  /** Borra el libro con sus capítulos y tarjetas; sale de la lista solo si el borrado terminó. */
  async remove(bookId: string): Promise<void> {
    const uid = requireSessionUid(this.session.user());
    await this.repository.deleteWithContents(uid, bookId);
    this.books.update((books) => books?.filter((book) => book.id !== bookId));
  }

  /** Refleja en la lista un cambio del contador que el almacén ya guardó. */
  changeCardCount(bookId: string, delta: number): void {
    this.books.update((books) =>
      books?.map((book) =>
        book.id === bookId ? { ...book, cardCount: (book.cardCount ?? 0) + delta } : book,
      ),
    );
  }

  /** Añade a la lista cargada un libro creado por otra vía (la importación). */
  addLocal(book: Book): void {
    if (this.books.hasValue()) {
      this.books.update((books) => [...(books ?? []), book]);
    }
  }

  /** Cuántos capítulos y tarjetas se borrarían con el libro (agregación en el servidor). */
  countContents(bookId: string): Promise<BookContents> {
    return this.repository.countContents(requireSessionUid(this.session.user()), bookId);
  }

  /**
   * Totales por estado del libro para la cabecera del detalle. Los conteos siempre van al
   * servidor: sin red no se piden (el recurso queda sin valor) y al volver la red se piden solos.
   * Se crea en el contexto de inyección de quien lo usa.
   */
  totalsFor(bookId: Signal<string | undefined>): ResourceRef<CardStateTotals | undefined> {
    return resource({
      params: () => (this.connectivity.online() ? bookId() : undefined),
      loader: ({ params }) =>
        this.repository.countCardsByState(requireSessionUid(this.session.user()), params),
    });
  }

  /**
   * La posición de un libro nuevo: al final de la Biblioteca (0 si es el primero). Quien acaba de
   * esperar `ensureLoaded()` le pasa esa lista: el recurso puede no haberla recibido aún.
   */
  nextOrder(books: readonly Book[] = this.books.hasValue() ? this.books.value() : []): number {
    return books.length === 0 ? 0 : Math.max(...books.map((book) => book.order)) + 1;
  }

  private load(): Promise<Book[]> {
    const uid = requireSessionUid(this.session.user());
    if (this.lastLoad?.uid !== uid) {
      this.lastLoad = { uid, promise: this.repository.listByUser(uid) };
    }
    return this.lastLoad.promise;
  }
}

function normalizeSubject(subject: string): string {
  return subject.trim() || DEFAULT_SUBJECT;
}

function normalizeIdentity(identity: BookIdentity): BookIdentity {
  return { name: identity.name.trim(), subject: normalizeSubject(identity.subject) };
}
