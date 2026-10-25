import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import type { Book } from '@domain/models/book.model';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { DialogService } from '@shared/dialog/dialog.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { IconComponent } from '@shared/icon/icon.component';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';

import { PendingPageComponent } from '../../shell/pending-page/pending-page.component';
import { BIBLIOTECA_COPY } from '../biblioteca.copy';
import {
  BookFormDialogComponent,
  type BookFormDialogData,
} from '../book-form-dialog/book-form-dialog.component';
import {
  BookSettingsDialogComponent,
  type BookSettingsDialogData,
} from '../book-settings-dialog/book-settings-dialog.component';

type DetailView = 'loading' | 'error' | 'notFound' | 'book';

// Detalle de un libro: cabecera (volver, nombre, materia, totales por estado, editar y ajustes) y
// debajo la región de capítulos. Entrando directo por la dirección, carga la Biblioteca. Los
// totales se cuentan en el servidor: sin red o si el conteo falla se omiten, sin error.
@Component({
  selector: 'app-libro-detail-page',
  imports: [
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PendingPageComponent,
    SkeletonComponent,
  ],
  templateUrl: './libro-detail-page.component.html',
  styleUrl: './libro-detail-page.component.scss',
})
export class LibroDetailPageComponent {
  private readonly booksService = inject(BooksService);
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
  protected readonly totals = this.booksService.totalsFor(
    computed(() => (this.book() ? this.bookId() : undefined)),
  );

  constructor() {
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
