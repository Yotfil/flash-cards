import { Component, type OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { Chapter, ChapterDraft } from '@domain/models';
import { BooksService } from '@services/books.service';
import { ChaptersService } from '@services/chapters.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { ChapterFormDialogComponent } from './chapter-form-dialog.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';

/** Pantalla "detalle de un libro" (spec §8.3): cabecera del libro + CRUD de sus capítulos. Sólo
 *  pinta y captura eventos; la lógica vive en los servicios. Las tarjetas, sus conteos y el botón
 *  "estudiar este libro" llegan en ramas siguientes (F1.3+). */
@Component({
  selector: 'app-libro-detail',
  imports: [
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    ChapterFormDialogComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <section class="mx-auto max-w-2xl px-6 py-6">
      <a
        routerLink="/biblioteca"
        class="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        ← Biblioteca
      </a>

      @if (book(); as currentBook) {
        <header class="mt-3 flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h1 class="truncate text-2xl font-semibold text-text-primary">
              {{ currentBook.name }}
            </h1>
            <span
              class="mt-1.5 inline-block rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-text-secondary"
            >
              {{ currentBook.subject }}
            </span>
          </div>
          @if (chaptersStatus() === 'ready') {
            <button
              type="button"
              (click)="openCreate()"
              class="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Nuevo capítulo
            </button>
          }
        </header>
      } @else if (booksReady()) {
        <app-empty-state
          title="Libro no encontrado"
          message="Es posible que se haya borrado. Vuelve a la biblioteca."
        />
      }

      @if (actionError(); as message) {
        <p
          role="alert"
          class="mt-4 rounded-lg border border-border bg-surface-sunken px-4 py-2.5 text-sm text-text-secondary"
        >
          {{ message }}
        </p>
      }

      @if (book()) {
        @switch (chaptersStatus()) {
          @case ('loading') {
            <div class="mt-6 flex flex-col gap-3" aria-busy="true" aria-label="Cargando capítulos">
              @for (placeholder of skeletons; track placeholder) {
                <div
                  class="h-16 animate-pulse rounded-2xl border border-border bg-surface-sunken"
                ></div>
              }
            </div>
          }
          @case ('error') {
            <app-error-state
              title="No pudimos cargar los capítulos"
              [message]="chaptersError() ?? ''"
              (retry)="reload()"
            />
          }
          @case ('ready') {
            @if (chapters().length === 0) {
              <app-empty-state
                title="Este libro no tiene capítulos"
                message="Crea un capítulo para organizar las tarjetas dentro del libro."
              >
                <button
                  type="button"
                  (click)="openCreate()"
                  class="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
                >
                  Crear capítulo
                </button>
              </app-empty-state>
            } @else {
              <ul class="mt-6 flex flex-col gap-3">
                @for (chapter of chapters(); track chapter.id) {
                  <li
                    class="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-raised p-4"
                  >
                    <a
                      [routerLink]="['/biblioteca', bookId, chapter.id]"
                      class="min-w-0 truncate rounded-lg font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      {{ chapter.name }}
                    </a>
                    <div class="flex shrink-0 gap-2">
                      <button
                        type="button"
                        (click)="openRename(chapter)"
                        class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken"
                      >
                        Renombrar
                      </button>
                      <button
                        type="button"
                        [attr.aria-label]="'Borrar ' + chapter.name"
                        (click)="askDelete(chapter)"
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
      }
    </section>

    @if (showForm()) {
      <app-chapter-form-dialog
        [chapter]="editing()"
        (saved)="onSave($event)"
        (cancelled)="closeForm()"
      />
    }

    @if (pendingDelete(); as chapter) {
      <app-confirm-dialog
        title="¿Borrar este capítulo?"
        [message]="'Se eliminará «' + chapter.name + '» y no se puede deshacer.'"
        (confirmed)="confirmDelete(chapter)"
        (cancelled)="pendingDelete.set(null)"
      />
    }
  `,
})
export class LibroDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly booksService = inject(BooksService);
  private readonly chaptersService = inject(ChaptersService);

  protected readonly bookId = this.route.snapshot.paramMap.get('bookId') ?? '';

  protected readonly book = computed(() =>
    this.booksService.books().find((candidate) => candidate.id === this.bookId),
  );
  protected readonly booksReady = computed(() => this.booksService.status() === 'ready');

  protected readonly chapters = this.chaptersService.chapters;
  protected readonly chaptersStatus = this.chaptersService.status;
  protected readonly chaptersError = this.chaptersService.errorMessage;

  protected readonly skeletons = [0, 1, 2];

  protected readonly showForm = signal(false);
  protected readonly editing = signal<Chapter | null>(null);
  protected readonly pendingDelete = signal<Chapter | null>(null);
  protected readonly actionError = signal<string | null>(null);

  ngOnInit(): void {
    void this.booksService.ensureLoaded();
    void this.chaptersService.load(this.bookId);
  }

  protected reload(): void {
    void this.chaptersService.load(this.bookId);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.showForm.set(true);
  }

  protected openRename(chapter: Chapter): void {
    this.editing.set(chapter);
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
  }

  protected async onSave(draft: ChapterDraft): Promise<void> {
    this.actionError.set(null);
    const editingChapter = this.editing();
    try {
      if (editingChapter) {
        await this.chaptersService.rename(editingChapter.id, draft.name);
      } else {
        await this.chaptersService.create(this.bookId, draft.name);
      }
      this.closeForm();
    } catch (error) {
      console.error('No se pudo guardar el capítulo', error);
      this.actionError.set('No se pudo guardar el capítulo. Inténtalo de nuevo.');
    }
  }

  protected askDelete(chapter: Chapter): void {
    this.pendingDelete.set(chapter);
  }

  protected async confirmDelete(chapter: Chapter): Promise<void> {
    this.actionError.set(null);
    try {
      await this.chaptersService.remove(chapter.id);
    } catch (error) {
      console.error('No se pudo borrar el capítulo', error);
      this.actionError.set('No se pudo borrar el capítulo. Inténtalo de nuevo.');
    } finally {
      this.pendingDelete.set(null);
    }
  }
}
