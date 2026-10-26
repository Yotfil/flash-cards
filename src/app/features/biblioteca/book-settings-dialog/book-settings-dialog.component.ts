import { Component, computed, inject, signal } from '@angular/core';
import {
  FormField,
  form,
  submit,
  validateStandardSchema,
  type FieldTree,
} from '@angular/forms/signals';

import type { Book } from '@domain/models/book.model';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { AppDialogRef, DIALOG_DATA } from '@shared/dialog/dialog.service';
import { NEEDS_CONNECTION_MESSAGE } from '@shared/text/connection.copy';

import { BIBLIOTECA_COPY } from '../biblioteca.copy';
import { bookSettingsFormSchema, type BookSettingsFormValue } from '../book-settings-form.schema';

export interface BookSettingsDialogData {
  readonly book: Book;
}

// Ajustes de un libro: la tanda de nuevas por día y el tope de repasos (0 = sin tope). Guarda
// solo esos dos campos y se cierra con el libro actualizado; si falla, el error queda dentro.
@Component({
  selector: 'app-book-settings-dialog',
  imports: [FormField],
  templateUrl: './book-settings-dialog.component.html',
  styleUrl: './book-settings-dialog.component.scss',
})
export class BookSettingsDialogComponent {
  private readonly data = inject<BookSettingsDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<AppDialogRef<Book>>(AppDialogRef);
  private readonly books = inject(BooksService);
  private readonly logger = inject(Logger);

  protected readonly online = inject(ConnectivityPort).online;
  protected readonly copy = BIBLIOTECA_COPY.bookSettings;
  protected readonly needsConnection = NEEDS_CONNECTION_MESSAGE;
  protected readonly title = this.copy.title(this.data.book.name);

  private readonly model = signal<BookSettingsFormValue>({
    newCardsPerDay: this.data.book.newCardsPerDay,
    maxReviewsPerDay: this.data.book.maxReviewsPerDay,
  });
  protected readonly settingsForm = form(this.model, (path) =>
    validateStandardSchema(path, bookSettingsFormSchema),
  );
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  protected readonly canSubmit = computed(
    () => this.settingsForm().valid() && !this.saving() && this.online(),
  );

  /** El error de un campo se muestra en cuanto el usuario lo cambia o lo abandona. */
  protected fieldError(field: FieldTree<number>): string | null {
    const state = field();
    return (state.dirty() || state.touched()) && state.invalid()
      ? (state.errors()[0]?.message ?? null)
      : null;
  }

  protected async submitForm(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    await submit(this.settingsForm, async () => {
      await this.save();
      return undefined;
    });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  private async save(): Promise<void> {
    this.saving.set(true);
    this.failed.set(false);
    this.dialogRef.setPending(true);
    try {
      const { newCardsPerDay, maxReviewsPerDay } = this.model();
      const book = await this.books.update(this.data.book.id, { newCardsPerDay, maxReviewsPerDay });
      this.dialogRef.close(book);
    } catch (error) {
      this.logger.error(this.copy.saveError, error);
      this.failed.set(true);
      this.saving.set(false);
      this.dialogRef.setPending(false);
    }
  }
}
