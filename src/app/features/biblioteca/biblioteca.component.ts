import { Component, type OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Book, BookDraft } from '@domain/models';
import { BooksService } from '@services/books.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { BookFormDialogComponent } from './book-form-dialog.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';

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
  template: `
    <section class="mx-auto max-w-2xl px-6 py-6">
      <header class="flex items-center justify-between gap-4">
        <h1 class="text-2xl font-semibold text-text-primary">Biblioteca</h1>
        @if (status() === 'ready' && books().length > 0) {
          <button
            type="button"
            (click)="openCreate()"
            class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
          >
            Nuevo libro
          </button>
        }
      </header>

      @if (actionError(); as message) {
        <p
          role="alert"
          class="mt-4 rounded-lg border border-border bg-surface-sunken px-4 py-2.5 text-sm text-text-secondary"
        >
          {{ message }}
        </p>
      }

      @switch (status()) {
        @case ('loading') {
          <div class="mt-6 flex flex-col gap-3" aria-busy="true" aria-label="Cargando libros">
            @for (placeholder of skeletons; track placeholder) {
              <div
                class="h-24 animate-pulse rounded-2xl border border-border bg-surface-sunken"
              ></div>
            }
          </div>
        }
        @case ('error') {
          <app-error-state
            title="No pudimos cargar tus libros"
            [message]="errorMessage() ?? ''"
            (retry)="reload()"
          />
        }
        @case ('ready') {
          @if (books().length === 0) {
            <app-empty-state
              title="Aún no tienes libros"
              message="Crea tu primer libro para empezar a organizar tus tarjetas por tema."
            >
              <button
                type="button"
                (click)="openCreate()"
                class="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
              >
                Crear libro
              </button>
            </app-empty-state>
          } @else {
            <ul class="mt-6 flex flex-col gap-3">
              @for (book of books(); track book.id) {
                <li
                  class="flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface-raised p-5"
                >
                  <a
                    [routerLink]="['/biblioteca', book.id]"
                    class="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <h2 class="truncate font-medium text-text-primary">{{ book.name }}</h2>
                    <div class="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                      <span class="rounded-full bg-surface-sunken px-2 py-0.5 text-text-secondary">
                        {{ book.subject }}
                      </span>
                      <span>{{ book.cardCount ?? 0 }} tarjetas</span>
                      <span aria-hidden="true">·</span>
                      <span>{{ book.newCardsPerDay }} nuevas/día</span>
                    </div>
                  </a>
                  <div class="flex shrink-0 gap-2">
                    <button
                      type="button"
                      (click)="openEdit(book)"
                      class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      [attr.aria-label]="'Borrar ' + book.name"
                      (click)="askDelete(book)"
                      class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken"
                    >
                      Borrar
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        }
      }
    </section>

    @if (showForm()) {
      <app-book-form-dialog
        [book]="editing()"
        [pending]="saving()"
        (saved)="onSave($event)"
        (cancelled)="closeForm()"
      />
    }

    @if (pendingDelete(); as book) {
      <app-confirm-dialog
        title="¿Borrar este libro?"
        [message]="'Se eliminará «' + book.name + '» y no se puede deshacer.'"
        [pending]="deleting()"
        (confirmed)="confirmDelete(book)"
        (cancelled)="pendingDelete.set(null)"
      />
    }
  `,
})
export class BibliotecaComponent implements OnInit {
  private readonly booksService = inject(BooksService);

  protected readonly books = this.booksService.books;
  protected readonly status = this.booksService.status;
  protected readonly errorMessage = this.booksService.errorMessage;

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
