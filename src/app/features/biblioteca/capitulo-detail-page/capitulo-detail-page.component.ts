import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { resolveChapterDetail } from '@services/chapters/chapter-detail-state';
import { ChaptersService } from '@services/chapters/chapters.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { IconComponent } from '@shared/icon/icon.component';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';

import { PendingPageComponent } from '../../shell/pending-page/pending-page.component';
import { BIBLIOTECA_COPY, chapterDisplayName } from '../biblioteca.copy';

// Detalle de un capítulo. Reutiliza los libros y capítulos ya cargados y, entrando directo por la
// dirección, los carga. Qué pinta lo decide `resolveChapterDetail` a partir de los dos recursos.
// La zona de acciones (estudiar, practicar) y la región de tarjetas las llenan otros changes.
@Component({
  selector: 'app-capitulo-detail-page',
  imports: [
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PendingPageComponent,
    SkeletonComponent,
  ],
  templateUrl: './capitulo-detail-page.component.html',
  styleUrl: './capitulo-detail-page.component.scss',
})
export class CapituloDetailPageComponent {
  private readonly booksService = inject(BooksService);
  private readonly chaptersService = inject(ChaptersService);
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

  constructor() {
    this.booksService.ensureLoaded().catch((error: unknown) => {
      // El fallo ya se pinta como estado de error (el recurso lo refleja); aquí solo se registra.
      this.logger.warn('No se pudo cargar la Biblioteca para el detalle del capítulo', error);
    });
    effect(() => this.chaptersService.ensureLoaded(this.bookId()));
  }

  protected displayName = chapterDisplayName;

  protected retry(failed: 'books' | 'chapters'): void {
    if (failed === 'books') {
      this.booksService.reload();
    } else {
      this.chaptersService.openBook(this.bookId());
    }
  }
}
