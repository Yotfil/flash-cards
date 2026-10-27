import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, submit, validateStandardSchema } from '@angular/forms/signals';

import type { Book } from '@domain/models/book.model';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { AppDialogRef, DIALOG_DATA } from '@shared/dialog/dialog.service';
import {
  CLOSE_LABEL,
  NEEDS_CONNECTION_MESSAGE,
  SAVED_ON_DEVICE_MESSAGE,
} from '@shared/text/connection.copy';

import { BIBLIOTECA_COPY } from '../biblioteca.copy';
import { bookFormSchema, type BookFormValue } from '@services/books/book-form.schema';

export type BookFormDialogData = { mode: 'create' } | { mode: 'edit'; book: Book };

// Crear o editar la identidad de un libro (nombre y materia). Se cierra solo con éxito, devolviendo
// el libro; si el guardado falla, el error se muestra dentro y lo escrito se conserva.
@Component({
  selector: 'app-book-form-dialog',
  imports: [FormField],
  templateUrl: './book-form-dialog.component.html',
  styleUrl: './book-form-dialog.component.scss',
})
export class BookFormDialogComponent {
  private readonly data = inject<BookFormDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<AppDialogRef<Book>>(AppDialogRef);
  private readonly books = inject(BooksService);
  private readonly logger = inject(Logger);

  protected readonly online = inject(ConnectivityPort).online;
  protected readonly copy = BIBLIOTECA_COPY.bookForm;
  protected readonly needsConnection = NEEDS_CONNECTION_MESSAGE;
  protected readonly savedOnDevice = SAVED_ON_DEVICE_MESSAGE;
  protected readonly closeLabel = CLOSE_LABEL;
  /** Pasado el plazo sin confirmar: lo escrito ya está en el dispositivo y se deja cerrar. */
  protected readonly savingTooLong = this.dialogRef.savingTooLong;
  protected readonly isEdit = this.data.mode === 'edit';

  private readonly model = signal<BookFormValue>(
    this.data.mode === 'edit'
      ? { name: this.data.book.name, subject: this.data.book.subject }
      : { name: '', subject: '' },
  );
  protected readonly bookForm = form(this.model, (path) =>
    validateStandardSchema(path, bookFormSchema),
  );
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  protected readonly canSubmit = computed(
    () => this.bookForm().valid() && !this.saving() && this.online(),
  );
  protected readonly nameError = computed(() => {
    const name = this.bookForm.name();
    return name.touched() && name.invalid() ? (name.errors()[0]?.message ?? null) : null;
  });

  protected async submitForm(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    await submit(this.bookForm, async () => {
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
    this.dialogRef.setPending(true, { releaseWhenSlow: true });
    try {
      const book =
        this.data.mode === 'edit'
          ? await this.books.update(this.data.book.id, this.model())
          : await this.books.create(this.model());
      this.dialogRef.close(book);
    } catch (error) {
      this.logger.error(this.copy.saveError, error);
      this.failed.set(true);
      this.saving.set(false);
      this.dialogRef.setPending(false);
    }
  }
}
