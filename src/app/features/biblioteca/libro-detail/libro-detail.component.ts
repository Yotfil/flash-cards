import { Component, type OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { Chapter, ChapterDraft } from '@domain/models';
import { BooksService } from '@services/books.service';
import { ChaptersService } from '@services/chapters.service';
import { ReviewService } from '@services/review';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { ChapterFormDialogComponent } from '../chapter-form-dialog/chapter-form-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

/** Pantalla "detalle de un libro" (spec §8.3): cabecera del libro + CRUD de sus capítulos + estudiar.
 *  Sólo pinta y captura eventos; la lógica vive en los servicios. */
@Component({
  selector: 'app-libro-detail',
  imports: [
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    ChapterFormDialogComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './libro-detail.component.html',
  styleUrl: './libro-detail.component.scss',
})
export class LibroDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly booksService = inject(BooksService);
  private readonly chaptersService = inject(ChaptersService);
  private readonly reviewService = inject(ReviewService);

  protected readonly bookId = this.route.snapshot.paramMap.get('bookId') ?? '';
  protected readonly studying = signal(false);
  protected readonly studyMessage = signal<string | null>(null);

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
  // En vuelo: bloquean los botones de los diálogos para evitar acciones duplicadas.
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);

  ngOnInit(): void {
    void this.booksService.ensureLoaded();
    void this.chaptersService.load(this.bookId);
  }

  protected reload(): void {
    void this.chaptersService.load(this.bookId);
  }

  /** Inicia una sesión de repaso con las tarjetas listas del libro; si no hay, avisa sin entrar. */
  protected async studyBook(): Promise<void> {
    if (this.studying()) {
      return;
    }
    this.studyMessage.set(null);
    this.studying.set(true);
    try {
      const count = await this.reviewService.startBook(this.bookId);
      if (count === 0) {
        this.studyMessage.set('Estás al día con este libro. No hay tarjetas para repasar ahora.');
        return;
      }
      await this.router.navigate(['/repaso']);
    } finally {
      this.studying.set(false);
    }
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
    if (this.saving()) {
      return;
    }
    this.actionError.set(null);
    this.saving.set(true);
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
    } finally {
      this.saving.set(false);
    }
  }

  protected askDelete(chapter: Chapter): void {
    this.pendingDelete.set(chapter);
  }

  protected async confirmDelete(chapter: Chapter): Promise<void> {
    if (this.deleting()) {
      return;
    }
    this.actionError.set(null);
    this.deleting.set(true);
    try {
      await this.chaptersService.remove(chapter.id);
    } catch (error) {
      console.error('No se pudo borrar el capítulo', error);
      this.actionError.set('No se pudo borrar el capítulo. Inténtalo de nuevo.');
    } finally {
      this.deleting.set(false);
      this.pendingDelete.set(null);
    }
  }
}
