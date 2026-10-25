import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import type { Book } from '@domain/models/book.model';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '@shared/confirm-dialog/confirm-dialog.component';
import { DialogService } from '@shared/dialog/dialog.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';

import { BIBLIOTECA_COPY, bookDeletionDetail } from '../biblioteca.copy';
import { BookCardComponent } from '../book-card/book-card.component';
import {
  BookFormDialogComponent,
  type BookFormDialogData,
} from '../book-form-dialog/book-form-dialog.component';
import {
  BookSettingsDialogComponent,
  type BookSettingsDialogData,
} from '../book-settings-dialog/book-settings-dialog.component';
import { PracticePackagesSectionComponent } from '../../practica-ia/practice-packages-section/practice-packages-section.component';

type LibraryView = 'loading' | 'error' | 'empty' | 'list';

// Biblioteca: relee los libros cada vez que se abre y pinta uno de cuatro estados (esqueleto,
// error con Reintentar, vacío como bienvenida o la lista). Un fallo nunca se pinta como vacío.
@Component({
  selector: 'app-biblioteca-page',
  imports: [
    BookCardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    PracticePackagesSectionComponent,
    SkeletonComponent,
  ],
  templateUrl: './biblioteca-page.component.html',
  styleUrl: './biblioteca-page.component.scss',
})
export class BibliotecaPageComponent {
  private readonly booksService = inject(BooksService);
  private readonly dialogs = inject(DialogService);
  private readonly router = inject(Router);
  private readonly logger = inject(Logger);
  private readonly online = inject(ConnectivityPort).online;

  protected readonly copy = BIBLIOTECA_COPY;
  protected readonly books = computed(() =>
    this.booksService.books.hasValue() ? this.booksService.books.value() : [],
  );
  protected readonly view = computed<LibraryView>(() => {
    const status = this.booksService.books.status();
    if (status === 'error') {
      return 'error';
    }
    if (status !== 'resolved' && status !== 'local') {
      return 'loading';
    }
    return this.books().length === 0 ? 'empty' : 'list';
  });

  constructor() {
    this.booksService.reload();
  }

  protected retry(): void {
    this.booksService.reload();
  }

  protected openBook(book: Book): void {
    void this.router.navigate(['/biblioteca', book.id]);
  }

  protected importBook(): void {
    void this.router.navigateByUrl('/importar');
  }

  protected newBook(): void {
    this.dialogs.open<Book, BookFormDialogData>(BookFormDialogComponent, {
      label: this.copy.bookForm.createTitle,
      data: { mode: 'create' },
    });
  }

  protected openSettings(book: Book): void {
    this.dialogs.open<Book, BookSettingsDialogData>(BookSettingsDialogComponent, {
      label: this.copy.bookSettings.title(book.name),
      data: { book },
    });
  }

  /**
   * Con red cuenta capítulos y tarjetas para que la confirmación diga qué se pierde; sin red, o si
   * el conteo falla, la confirmación se abre igual con el texto sin números.
   */
  protected async askDelete(book: Book): Promise<void> {
    const counts = this.online() ? await this.countContents(book) : null;
    this.dialogs.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      label: this.copy.deleteBook.title,
      size: 'sm',
      data: {
        title: this.copy.deleteBook.title,
        message: this.copy.deleteBook.message(book.name),
        detail: bookDeletionDetail(counts),
        confirmLabel: this.copy.deleteBook.confirm,
        pendingLabel: this.copy.deleteBook.pending,
        errorMessage: this.copy.deleteBook.error,
        action: () => this.booksService.remove(book.id),
      },
    });
  }

  private async countContents(book: Book): Promise<{ chapters: number; cards: number } | null> {
    try {
      return await this.booksService.countContents(book.id);
    } catch (error) {
      this.logger.warn('No se pudo contar el contenido del libro antes de borrarlo', error);
      return null;
    }
  }
}
