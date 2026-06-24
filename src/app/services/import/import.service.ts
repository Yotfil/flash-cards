// Orquesta la importación de un archivo como libro nuevo: toma el resultado del parser, arma la
// jerarquía (libro + capítulos + tarjetas con su scheduling inicial) y la escribe vía ImportRepository.
// No conoce Firestore ni ts-fsrs. El `uid` se resuelve aquí (sesión).

import { Injectable, inject } from '@angular/core';

import { ImportRepository, SchedulingPort, type ImportBookInput } from '@domain/ports';
import type { Book } from '@domain/models';
import { AuthService } from '@services/auth.service';
import {
  BooksService,
  DEFAULT_MAX_REVIEWS_PER_DAY,
  DEFAULT_NEW_CARDS_PER_DAY,
} from '@services/books.service';
import type { ParseResult } from './flashcard-parser';

export interface ImportSummary {
  bookId: string;
  chapterCount: number;
  cardCount: number;
}

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly importRepository = inject(ImportRepository);
  private readonly schedulingPort = inject(SchedulingPort);
  private readonly booksService = inject(BooksService);
  private readonly authService = inject(AuthService);

  /** Crea un libro con los capítulos y tarjetas del `parseResult`. Devuelve un resumen. */
  async importBook(bookName: string, parseResult: ParseResult): Promise<ImportSummary> {
    const uid = this.requireUid();
    await this.booksService.ensureLoaded();

    const name = bookName.trim() || 'Libro importado';
    const order = this.booksService.nextBookOrder();
    const cardCount = parseResult.validCardCount;

    const bookMeta: Omit<Book, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      subject: 'general',
      studyDirection: 'forward',
      newCardsPerDay: DEFAULT_NEW_CARDS_PER_DAY,
      maxReviewsPerDay: DEFAULT_MAX_REVIEWS_PER_DAY,
      order,
      cardCount,
    };

    const input: ImportBookInput = {
      book: bookMeta,
      chapters: parseResult.chapters.map((chapter, index) => ({
        name: chapter.name,
        order: index,
        cards: chapter.cards.map((card) => ({
          noteId: crypto.randomUUID(),
          direction: 'forward' as const,
          front: card.front,
          back: card.back,
          scheduling: this.schedulingPort.createInitialScheduling(),
          suspended: false,
        })),
      })),
    };

    const bookId = await this.importRepository.importBook(uid, input);
    const now = new Date();
    this.booksService.addLocal({ ...bookMeta, id: bookId, createdAt: now, updatedAt: now });

    return { bookId, chapterCount: input.chapters.length, cardCount };
  }

  private requireUid(): string {
    const uid = this.authService.currentUser()?.id;
    if (!uid) {
      throw new Error('No hay una sesión activa para importar.');
    }
    return uid;
  }
}
