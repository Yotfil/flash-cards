import { Injectable, inject, signal } from '@angular/core';

import type { CardContentDraft, CardFace } from '@domain/models/card.model';
import { initialCardScheduling } from '@domain/models/card-scheduling';
import { DEFAULT_MAX_REVIEWS_PER_DAY } from '@domain/models/study-defaults';
import {
  ImportBookError,
  ImportRepository,
  type ImportedCardInput,
} from '@domain/ports/import.repository';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { CardsService } from '@services/cards/cards.service';
import { CardCollectionChanges } from '@services/progress/card-collection-changes';
import { requireSessionUser } from '@services/session/require-session';
import { SessionService } from '@services/session/session.service';

import { countRepeatedLines } from './count-repeated-lines';
import { parseImportText, type ImportParseResult } from './parse-import-text';

/** El nombre de un libro importado cuando se deja en blanco. */
export const DEFAULT_IMPORTED_BOOK_NAME = 'Libro importado';
const DEFAULT_SUBJECT = 'general';

export interface ImportPreview {
  readonly parse: ImportParseResult;
  /** Líneas válidas que entrarán repetidas (no se filtran: solo se avisa). */
  readonly repeatedCount: number;
}

export interface ImportBookSummary {
  readonly bookId: string;
  readonly chapterCount: number;
  readonly cardCount: number;
}

/** Lo que la página "Importar un libro" confirma. */
export interface BookImportDraft {
  readonly name: string;
  readonly subject: string;
  readonly text: string;
}

/** Un libro que se está importando: sigue en curso aunque el usuario salga de la página. */
export interface BookImportInFlight extends BookImportDraft {
  /** Termina con el libro creado, o falla (el detalle ya quedó registrado). */
  readonly done: Promise<ImportBookSummary>;
}

export type ImportMode = 'append' | 'replace';

// Importar texto: previsualizar (puro, en memoria, sin escribir nada) y confirmar, sea como un
// libro nuevo o dentro de un capítulo. Los mensajes para el usuario los elige la pantalla.
@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly repository = inject(ImportRepository);
  private readonly books = inject(BooksService);
  private readonly cards = inject(CardsService);
  private readonly collectionChanges = inject(CardCollectionChanges);
  private readonly session = inject(SessionService);
  private readonly logger = inject(Logger);

  private readonly bookImportSignal = signal<BookImportInFlight | null>(null);
  /**
   * El libro que se está importando, si hay uno. La página, al volver, lo muestra en curso en vez
   * de ofrecer otra importación: con mala señal, repetirla crearía dos libros iguales.
   */
  readonly bookImport = this.bookImportSignal.asReadonly();

  /** Al importar un libro, las repetidas se cuentan solo dentro del texto. */
  previewForBook(text: string, bookName: string): ImportPreview {
    const parse = parseImportText(text, bookName);
    return { parse, repeatedCount: countRepeatedLines(draftsOf(parse), []) };
  }

  /**
   * En un capítulo (o un paquete), también contra lo que ya tiene (ya cargado: sin lecturas).
   */
  previewForChapter(
    text: string,
    chapterName: string,
    existing: readonly CardFace[],
  ): ImportPreview {
    const parse = parseImportText(text, chapterName);
    return { parse, repeatedCount: countRepeatedLines(draftsOf(parse), existing) };
  }

  /**
   * Crea el libro entero (capítulos y tarjetas nuevas) y lo añade a la Biblioteca. Mientras dura,
   * `bookImport` lo recuerda.
   */
  importBook(draft: BookImportDraft): Promise<ImportBookSummary> {
    const done = this.writeBook(draft);
    const inFlight: BookImportInFlight = { ...draft, done };
    this.bookImportSignal.set(inFlight);
    const finish = () => {
      if (this.bookImportSignal() === inFlight) {
        this.bookImportSignal.set(null);
      }
    };
    // Bien o mal, deja de estar en curso; el resultado (o el error) lo recibe quien espera `done`.
    done.then(finish, finish);
    return done;
  }

  /**
   * El texto se vuelve a procesar aquí (puro, milisegundos): da lo mismo que la previsualización.
   * Todo fallo queda registrado, también el de las lecturas previas (la Biblioteca, la sesión).
   */
  private async writeBook({ name, subject, text }: BookImportDraft): Promise<ImportBookSummary> {
    const parse = this.previewForBook(text, name.trim() || DEFAULT_IMPORTED_BOOK_NAME).parse;
    const now = new Date();
    try {
      const user = requireSessionUser(this.session.user());
      const library = await this.books.ensureLoaded();
      const book = await this.collectionChanges.afterWrite(
        this.repository.importBook(user.id, {
          book: {
            name: name.trim() || DEFAULT_IMPORTED_BOOK_NAME,
            subject: subject.trim() || DEFAULT_SUBJECT,
            studyDirection: 'forward',
            newCardsPerDay: user.settings.defaultNewCardsPerDay,
            maxReviewsPerDay: DEFAULT_MAX_REVIEWS_PER_DAY,
            order: this.books.nextOrder(library),
            cardCount: parse.validCardCount,
          },
          chapters: parse.package.chapters.map((chapter, order) => ({
            name: chapter.name,
            order,
            cards: chapter.cards.map((draft) => newImportedCard(draft, now)),
          })),
        }),
      );
      this.books.addLocal(book);
      return { bookId: book.id, chapterCount: parse.chapterCount, cardCount: parse.validCardCount };
    } catch (error) {
      this.logger.error(`No se pudo importar el libro${importFailureDetail(error)}`, error);
      throw error;
    }
  }

  /** Agrega las tarjetas al capítulo o reemplaza las que tiene. Sin tarjetas no escribe nada. */
  async importIntoChapter(
    bookId: string,
    chapterId: string,
    drafts: readonly CardContentDraft[],
    mode: ImportMode,
  ): Promise<void> {
    if (drafts.length === 0) {
      return;
    }
    if (mode === 'append') {
      await this.cards.createMany(bookId, chapterId, drafts);
    } else {
      await this.cards.replaceAll(bookId, chapterId, drafts);
    }
  }
}

/** Qué quedó escrito y, si no se pudo deshacer, por qué: lo que hace falta para limpiar a mano. */
function importFailureDetail(error: unknown): string {
  if (!(error instanceof ImportBookError)) {
    return '';
  }
  const rollback =
    error.rollbackFailure === undefined ? '' : `; al deshacer: ${String(error.rollbackFailure)}`;
  return ` (${error.committedCount} escrituras confirmadas, deshechas: ${error.rolledBack}${rollback})`;
}

function draftsOf(parse: ImportParseResult): CardContentDraft[] {
  return parse.package.chapters.flatMap((chapter) => chapter.cards);
}

/** Una tarjeta importada nace como cualquier otra: nueva, activa e independiente. */
function newImportedCard(draft: CardContentDraft, now: Date): ImportedCardInput {
  const isCloze = draft.cardType === 'cloze';
  return {
    noteId: crypto.randomUUID(),
    direction: 'forward',
    ...(isCloze ? { cardType: 'cloze' as const } : {}),
    front: draft.front,
    back: isCloze ? '' : draft.back,
    ...(draft.example ? { example: draft.example } : {}),
    scheduling: initialCardScheduling(now),
    suspended: false,
  };
}
