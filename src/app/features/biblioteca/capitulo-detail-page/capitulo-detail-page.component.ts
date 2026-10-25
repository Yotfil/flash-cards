import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import type { Chapter } from '@domain/models/chapter.model';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { CardsService } from '@services/cards/cards.service';
import { resolveChapterDetail } from '@services/chapters/chapter-detail-state';
import { ChaptersService } from '@services/chapters/chapters.service';
import { BookReadyCardsService } from '@services/queue/book-ready-cards.service';
import type { StudySource } from '@services/queue/study-handoff.service';
import { DialogService } from '@shared/dialog/dialog.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { IconComponent } from '@shared/icon/icon.component';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';

import { StudyLaunchButtonComponent } from '../../estudio/study-launch-button/study-launch-button.component';
import {
  CardImportDialogComponent,
  type CardImportDialogData,
} from '../../importacion/card-import-dialog/card-import-dialog.component';
import { BIBLIOTECA_COPY, chapterDisplayName } from '../biblioteca.copy';
import { CardListComponent } from '../card-list/card-list.component';

// Detalle de un capítulo. Reutiliza los libros y capítulos ya cargados y, entrando directo por la
// dirección, los carga. Qué pinta lo decide `resolveChapterDetail` a partir de los dos recursos.
// La región "Tarjetas" es la lista del capítulo; la zona de acciones ofrece "Estudiar este capítulo"
// cuando sus tarjetas cargaron y hay al menos una (practicar llega con su change).
@Component({
  selector: 'app-capitulo-detail-page',
  imports: [
    RouterLink,
    CardListComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    SkeletonComponent,
    StudyLaunchButtonComponent,
  ],
  templateUrl: './capitulo-detail-page.component.html',
  styleUrl: './capitulo-detail-page.component.scss',
})
export class CapituloDetailPageComponent {
  private readonly booksService = inject(BooksService);
  private readonly chaptersService = inject(ChaptersService);
  private readonly cardsService = inject(CardsService);
  private readonly bookReady = inject(BookReadyCardsService);
  private readonly dialogs = inject(DialogService);
  private readonly logger = inject(Logger);

  protected readonly copy = BIBLIOTECA_COPY;
  private readonly params = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((params) => ({
        bookId: params.get('bookId') ?? '',
        chapterId: params.get('chapterId') ?? '',
      })),
    ),
    { initialValue: { bookId: '', chapterId: '' } },
  );
  private readonly bookId = computed(() => this.params().bookId);
  private readonly chapterId = computed(() => this.params().chapterId);
  private readonly chapter = this.chaptersService.chapterById(this.chapterId);

  protected readonly state = computed(() => {
    const chaptersStatus = this.chaptersService.chapters.status();
    const chaptersReady = chaptersStatus === 'resolved' || chaptersStatus === 'local';
    const chapter = this.chapter();
    return resolveChapterDetail({
      booksStatus: this.booksService.books.status(),
      book: this.booksService.findById(this.bookId()),
      chaptersStatus,
      // Mientras se cargan los capítulos de otro libro, la lista anterior no cuenta.
      chapter: !chaptersReady
        ? undefined
        : chapter && chapter.bookId === this.bookId()
          ? chapter
          : null,
    });
  });

  protected readonly canStudy = computed(() => {
    const cards = this.cardsService.cards;
    const status = cards.status();
    const loaded = status === 'resolved' || status === 'local';
    return loaded && cards.hasValue() && cards.value().length > 0;
  });
  protected readonly studySource = computed<StudySource>(() => ({
    kind: 'chapter',
    bookId: this.bookId(),
    chapterId: this.chapterId(),
  }));
  protected readonly prepareStudy = () => this.bookReady.prepareChapterSession(this.chapterId());

  constructor() {
    this.booksService.ensureLoaded().catch((error: unknown) => {
      // El fallo ya se pinta como estado de error (el recurso lo refleja); aquí solo se registra.
      this.logger.warn('No se pudo cargar la Biblioteca para el detalle del capítulo', error);
    });
    effect(() => this.chaptersService.ensureLoaded(this.bookId()));
  }

  protected displayName = chapterDisplayName;

  /** "Importar tarjetas" en este capítulo: las nuevas aparecen en la lista al cerrar. */
  protected importCards(bookId: string, chapter: Chapter): void {
    this.dialogs.open<boolean, CardImportDialogData>(CardImportDialogComponent, {
      label: this.copy.importCards,
      size: 'lg',
      data: {
        bookId,
        chapterId: chapter.id,
        chapterName: chapterDisplayName(chapter),
        chapterCards: this.cardsService.sorted,
      },
    });
  }

  protected retry(failed: 'books' | 'chapters'): void {
    if (failed === 'books') {
      this.booksService.reload();
    } else {
      this.chaptersService.openBook(this.bookId());
    }
  }
}
