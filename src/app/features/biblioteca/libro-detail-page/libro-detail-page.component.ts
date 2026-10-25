import { Component, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import type { Book } from '@domain/models/book.model';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { ChaptersService } from '@services/chapters/chapters.service';
import { BookReadyCardsService } from '@services/queue/book-ready-cards.service';
import type { StudySource } from '@services/queue/study-handoff.service';
import { DialogService } from '@shared/dialog/dialog.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { IconComponent } from '@shared/icon/icon.component';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';

import { BIBLIOTECA_COPY } from '../biblioteca.copy';
import {
  BookFormDialogComponent,
  type BookFormDialogData,
} from '../book-form-dialog/book-form-dialog.component';
import {
  BookSettingsDialogComponent,
  type BookSettingsDialogData,
} from '../book-settings-dialog/book-settings-dialog.component';
import { StudyLaunchButtonComponent } from '../../estudio/study-launch-button/study-launch-button.component';
import { ChapterListComponent } from '../chapter-list/chapter-list.component';

type DetailView = 'loading' | 'error' | 'notFound' | 'book';

// Detalle de un libro: cabecera (volver, nombre, materia, totales por estado, editar y ajustes, y
// la zona de acciones con "Estudiar este libro") y debajo la lista de capítulos (que avisa cuando
// un borrado cambia los totales). Entrando directo por la dirección, carga la Biblioteca. Los
// totales se cuentan en el servidor: sin red o si el conteo falla se omiten, sin error.
@Component({
  selector: 'app-libro-detail-page',
  imports: [
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    ChapterListComponent,
    SkeletonComponent,
    StudyLaunchButtonComponent,
  ],
  templateUrl: './libro-detail-page.component.html',
  styleUrl: './libro-detail-page.component.scss',
})
export class LibroDetailPageComponent {
  private readonly booksService = inject(BooksService);
  private readonly chaptersService = inject(ChaptersService);
  private readonly bookReady = inject(BookReadyCardsService);
  private readonly dialogs = inject(DialogService);
  private readonly logger = inject(Logger);

  protected readonly copy = BIBLIOTECA_COPY;
  private readonly bookId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('bookId') ?? '')),
    { initialValue: '' },
  );
  protected readonly book = computed(() => this.booksService.findById(this.bookId()));
  protected readonly view = computed<DetailView>(() => {
    if (this.booksService.books.status() === 'error') {
      return 'error';
    }
    const book = this.book();
    if (book === undefined) {
      return 'loading';
    }
    return book === null ? 'notFound' : 'book';
  });
  /** El id solo cuando el libro existe: renombrarlo no vuelve a abrir sus listas. */
  private readonly foundBookId = computed(() => (this.book() ? this.bookId() : undefined));
  protected readonly totals = this.booksService.totalsFor(this.foundBookId);
  /** Estudiar se ofrece cuando los capítulos del libro ya cargaron. */
  protected readonly canStudy = computed(() => {
    const status = this.chaptersService.chapters.status();
    return status === 'resolved' || status === 'local';
  });
  protected readonly studySource = computed<StudySource>(() => ({
    kind: 'book',
    bookId: this.bookId(),
  }));
  protected readonly prepareStudy = () => this.bookReady.prepareBookSession(this.bookId());

  constructor() {
    // Las listas por capítulo (filas) y el botón de estudiar usan las del libro abierto.
    effect(() => {
      const bookId = this.foundBookId();
      if (bookId) {
        untracked(() => this.bookReady.openBook(bookId));
      }
    });
    this.booksService.ensureLoaded().catch((error: unknown) => {
      // El fallo ya se pinta como estado de error (el recurso lo refleja); aquí solo se registra.
      this.logger.warn('No se pudo cargar la Biblioteca para el detalle del libro', error);
    });
  }

  protected retry(): void {
    this.booksService.reload();
  }

  protected edit(book: Book): void {
    this.dialogs.open<Book, BookFormDialogData>(BookFormDialogComponent, {
      label: this.copy.bookForm.editTitle,
      data: { mode: 'edit', book },
    });
  }

  protected openSettings(book: Book): void {
    this.dialogs.open<Book, BookSettingsDialogData>(BookSettingsDialogComponent, {
      label: this.copy.bookSettings.title(book.name),
      data: { book },
    });
  }
}
