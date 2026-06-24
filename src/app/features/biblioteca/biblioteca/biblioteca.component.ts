import { Component, type OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DEFAULT_NEW_CARDS_PER_DAY } from '@domain/models';
import type { Book, BookDraft } from '@domain/models';
import { AuthService } from '@services/auth.service';
import { BooksService } from '@services/books.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { BookFormDialogComponent } from '../book-form-dialog/book-form-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

/** Pantalla "Biblioteca": CRUD de libros (Fase 1). Sólo pinta y captura eventos; toda la lógica y
 *  el estado viven en `BooksService`. Tocar un libro abre su detalle (capítulos). */
@Component({
  selector: 'app-biblioteca',
  imports: [
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    BookFormDialogComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './biblioteca.component.html',
  styleUrl: './biblioteca.component.scss',
})
export class BibliotecaComponent implements OnInit {
  private readonly booksService = inject(BooksService);
  private readonly authService = inject(AuthService);

  protected readonly books = this.booksService.books;
  protected readonly status = this.booksService.status;
  protected readonly errorMessage = this.booksService.errorMessage;

  /** Default global del usuario para precargar el form de un libro nuevo (Ajustes). */
  protected readonly defaultNewCardsPerDay = computed(
    () =>
      this.authService.currentUser()?.settings.defaultNewCardsPerDay ?? DEFAULT_NEW_CARDS_PER_DAY,
  );

  protected readonly skeletons = [0, 1, 2];

  // Estado local de los diálogos (sólo de la vista).
  protected readonly showForm = signal(false);
  protected readonly editing = signal<Book | null>(null);
  protected readonly pendingDelete = signal<Book | null>(null);
  protected readonly actionError = signal<string | null>(null);
  // En vuelo: bloquean los botones de los diálogos para evitar acciones duplicadas.
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);

  ngOnInit(): void {
    void this.booksService.load();
  }

  protected reload(): void {
    void this.booksService.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.showForm.set(true);
  }

  protected openEdit(book: Book): void {
    this.editing.set(book);
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
  }

  protected async onSave(draft: BookDraft): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.actionError.set(null);
    this.saving.set(true);
    const editingBook = this.editing();
    try {
      if (editingBook) {
        await this.booksService.update(editingBook.id, draft);
      } else {
        await this.booksService.create(draft);
      }
      this.closeForm();
    } catch (error) {
      console.error('No se pudo guardar el libro', error);
      this.actionError.set('No se pudo guardar el libro. Inténtalo de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }

  protected askDelete(book: Book): void {
    this.pendingDelete.set(book);
  }

  protected async confirmDelete(book: Book): Promise<void> {
    if (this.deleting()) {
      return;
    }
    this.actionError.set(null);
    this.deleting.set(true);
    try {
      await this.booksService.remove(book.id);
    } catch (error) {
      console.error('No se pudo borrar el libro', error);
      this.actionError.set('No se pudo borrar el libro. Inténtalo de nuevo.');
    } finally {
      this.deleting.set(false);
      this.pendingDelete.set(null);
    }
  }
}
