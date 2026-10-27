import { Injectable, inject } from '@angular/core';

import type { BookPackage } from '@domain/models/book-package';
import type { CardContentDraft } from '@domain/models/card.model';
import { CardRepository } from '@domain/ports/card.repository';
import { ChapterRepository } from '@domain/ports/chapter.repository';
import { FileDeliveryPort, type TextFile } from '@domain/ports/file-delivery.port';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { requireSessionUid } from '@services/session/require-session';
import { SessionService } from '@services/session/session.service';

import { buildBookPackage } from './build-book-package';
import { cardsThatWontReturn } from './cards-that-wont-return';
import { exportFileName } from './sanitize-file-name';
import { serializeBookPackage } from './serialize-book-package';

/** Lo que el diálogo muestra antes de entregar: el texto ya armado, sus conteos y sus avisos. */
export interface ExportPreview {
  readonly package: BookPackage;
  readonly text: string;
  readonly fileName: string;
  readonly chapterCount: number;
  readonly cardCount: number;
  /** Las tarjetas que no volverán igual al importar el texto, tal como se escriben. */
  readonly cardsThatWontReturn: readonly CardContentDraft[];
}

export type ExportDeliveryMode = 'share' | 'download' | 'copy';

// Exportar un libro: leerlo entero del servidor, armar el texto importable y entregarlo. Los
// mensajes para el usuario los elige la pantalla; aquí solo se registra el fallo y se relanza.
@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly books = inject(BooksService);
  private readonly chapters = inject(ChapterRepository);
  private readonly cards = inject(CardRepository);
  private readonly delivery = inject(FileDeliveryPort);
  private readonly session = inject(SessionService);
  private readonly logger = inject(Logger);

  async loadPackage(bookId: string): Promise<ExportPreview> {
    const uid = requireSessionUid(this.session.user());
    try {
      const library = await this.books.ensureLoaded();
      const book = library.find((candidate) => candidate.id === bookId);
      if (!book) {
        throw new Error(`El libro ${bookId} no existe.`);
      }
      const [chapters, cards] = await Promise.all([
        this.chapters.listByBook(uid, bookId),
        this.cards.listByBookFromServer(uid, bookId),
      ]);
      const bookPackage = buildBookPackage(book, chapters, cards);
      return {
        package: bookPackage,
        text: serializeBookPackage(bookPackage),
        fileName: exportFileName(book.name),
        chapterCount: bookPackage.chapters.length,
        cardCount: bookPackage.chapters.reduce((sum, chapter) => sum + chapter.cards.length, 0),
        cardsThatWontReturn: cardsThatWontReturn(bookPackage),
      };
    } catch (error) {
      this.logger.error(`No se pudo leer el libro ${bookId} para exportarlo`, error);
      throw error;
    }
  }

  /** `'cancelled'` solo si el usuario cerró la hoja de compartir sin elegir destino. */
  async deliver(preview: ExportPreview, mode: ExportDeliveryMode): Promise<'done' | 'cancelled'> {
    const file: TextFile = { name: preview.fileName, content: preview.text };
    try {
      if (mode === 'share') {
        return (await this.delivery.share(file)) === 'shared' ? 'done' : 'cancelled';
      }
      if (mode === 'download') {
        await this.delivery.download(file);
      } else {
        await this.delivery.copyText(file.content);
      }
      return 'done';
    } catch (error) {
      this.logger.error(`No se pudo entregar el libro exportado (${mode})`, error);
      throw error;
    }
  }
}
