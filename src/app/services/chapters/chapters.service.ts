import {
  Injectable,
  computed,
  inject,
  resource,
  signal,
  type ResourceRef,
  type Signal,
} from '@angular/core';

import type { Chapter } from '@domain/models/chapter.model';
import { ChapterRepository } from '@domain/ports/chapter.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { CardCollectionChanges } from '@services/progress/card-collection-changes';
import { requireSessionUid } from '@services/session/require-session';
import { SessionService } from '@services/session/session.service';

// Capítulos del libro abierto. La lista es un recurso que el detalle del libro relee en cada
// apertura y que el detalle del capítulo reutiliza si ya está cargada. Las mutaciones actualizan la
// lista local tras el éxito en el almacén; los mensajes para el usuario los elige la pantalla.
@Injectable({ providedIn: 'root' })
export class ChaptersService {
  private readonly repository = inject(ChapterRepository);
  private readonly session = inject(SessionService);
  private readonly books = inject(BooksService);
  private readonly collectionChanges = inject(CardCollectionChanges);
  private readonly connectivity = inject(ConnectivityPort);
  private readonly logger = inject(Logger);

  private readonly bookId = signal<string | undefined>(undefined);

  readonly chapters = resource({
    params: () => this.bookId(),
    loader: async ({ params }) => {
      try {
        return await this.repository.listByBook(requireSessionUid(this.session.user()), params);
      } catch (error) {
        // La pantalla pinta el error; aquí queda el detalle (p. ej. qué documento rechazó la frontera).
        this.logger.error(`No se pudieron leer los capítulos del libro ${params}`, error);
        throw error;
      }
    },
  });

  /** El detalle del libro: relee siempre, aunque sea el mismo libro. */
  openBook(bookId: string): void {
    if (this.bookId() === bookId) {
      this.chapters.reload();
    } else {
      this.bookId.set(bookId);
    }
  }

  /** El detalle del capítulo: carga el libro solo si no es el que ya está cargado. */
  ensureLoaded(bookId: string): void {
    if (this.bookId() !== bookId) {
      this.bookId.set(bookId);
    }
  }

  /** Crea un capítulo al final del libro abierto. El nombre se recorta aquí aunque la UI ya lo haga. */
  async create(name: string): Promise<Chapter> {
    const uid = requireSessionUid(this.session.user());
    const chapter = await this.repository.create(uid, {
      bookId: this.requireOpenBook(),
      name: name.trim(),
      order: this.nextOrder(),
    });
    this.chapters.update((chapters) => [...(chapters ?? []), chapter]);
    return chapter;
  }

  /** Cambia solo el nombre; la posición se conserva. */
  async rename(chapterId: string, name: string): Promise<Chapter> {
    const uid = requireSessionUid(this.session.user());
    const trimmed = name.trim();
    await this.repository.rename(uid, chapterId, trimmed);
    let renamed: Chapter | undefined;
    this.chapters.update((chapters) =>
      chapters?.map((chapter) => {
        if (chapter.id !== chapterId) {
          return chapter;
        }
        renamed = { ...chapter, name: trimmed, updatedAt: new Date() };
        return renamed;
      }),
    );
    if (!renamed) {
      throw new Error(`El capítulo ${chapterId} no está en la lista cargada.`);
    }
    return renamed;
  }

  /**
   * Borra el capítulo con sus tarjetas. Solo tras el éxito sale de la lista y el libro descuenta
   * las tarjetas borradas (el almacén ya lo hizo en cada lote). Devuelve cuántas se borraron.
   */
  async remove(chapterId: string): Promise<number> {
    const uid = requireSessionUid(this.session.user());
    const bookId = this.requireOpenBook();
    const deleted = await this.collectionChanges.afterWrite(
      this.repository.deleteWithCards(uid, bookId, chapterId),
    );
    this.chapters.update((chapters) => chapters?.filter((chapter) => chapter.id !== chapterId));
    this.books.changeCardCount(bookId, -deleted);
    return deleted;
  }

  /** Cuántas tarjetas tiene el capítulo, para la confirmación de borrado. */
  countCards(chapterId: string): Promise<number> {
    return this.repository.countCards(requireSessionUid(this.session.user()), chapterId);
  }

  /**
   * Conteo de tarjetas de una fila. Siempre va al servidor: sin red no se pide (sin valor) y al
   * volver la red se pide solo. Se crea en el contexto de inyección de quien lo usa.
   */
  cardCountFor(chapterId: Signal<string>): ResourceRef<number | undefined> {
    return resource({
      params: () => (this.connectivity.online() ? chapterId() : undefined),
      loader: ({ params }) =>
        this.repository.countCards(requireSessionUid(this.session.user()), params),
    });
  }

  private requireOpenBook(): string {
    const bookId = this.bookId();
    if (!bookId) {
      throw new Error('No hay un libro abierto.');
    }
    return bookId;
  }

  private nextOrder(): number {
    const chapters = this.chapters.hasValue() ? this.chapters.value() : [];
    return chapters.length === 0 ? 0 : Math.max(...chapters.map((chapter) => chapter.order)) + 1;
  }

  /** `undefined` mientras la lista no está lista, `null` si el capítulo no existe. */
  chapterById(chapterId: Signal<string>): Signal<Chapter | null | undefined> {
    return computed(() => {
      if (!this.chapters.hasValue()) {
        return undefined;
      }
      return this.chapters.value().find((chapter) => chapter.id === chapterId()) ?? null;
    });
  }
}
