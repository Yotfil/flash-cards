import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, validateStandardSchema } from '@angular/forms/signals';
import { Router } from '@angular/router';

import { ConnectivityPort } from '@domain/ports/connectivity.port';
import {
  importBookFormSchema,
  type ImportBookFormValue,
} from '@services/import/import-book-form.schema';
import { DEFAULT_IMPORTED_BOOK_NAME, ImportService } from '@services/import/import.service';
import { NEEDS_CONNECTION_MESSAGE } from '@shared/text/connection.copy';

import { ImportPreviewComponent } from '../import-preview/import-preview.component';
import { IMPORTACION_COPY, importLabel } from '../importacion.copy';

/** Lo que se le quita al nombre de un archivo para proponerlo como nombre del libro. */
const TEXT_FILE_EXTENSION = /\.(txt|md)$/i;

// "Importar un libro": nombre, materia opcional y el texto (pegado o desde un archivo), con la
// previsualización en vivo. Nada se escribe hasta confirmar; si falla, todo queda como estaba.
@Component({
  selector: 'app-importar-libro-page',
  imports: [FormField, ImportPreviewComponent],
  templateUrl: './importar-libro-page.component.html',
  styleUrl: './importar-libro-page.component.scss',
})
export class ImportarLibroPageComponent {
  private readonly importService = inject(ImportService);
  private readonly router = inject(Router);

  protected readonly online = inject(ConnectivityPort).online;
  protected readonly copy = IMPORTACION_COPY;
  protected readonly needsConnection = NEEDS_CONNECTION_MESSAGE;

  private readonly model = signal<ImportBookFormValue>({ name: '', subject: '' });
  protected readonly bookForm = form(this.model, (path) =>
    validateStandardSchema(path, importBookFormSchema),
  );
  protected readonly text = signal('');
  protected readonly preview = computed(() =>
    this.importService.previewForBook(
      this.text(),
      this.model().name.trim() || DEFAULT_IMPORTED_BOOK_NAME,
    ),
  );
  protected readonly validCount = computed(() => this.preview().parse.validCardCount);
  protected readonly importing = signal(false);
  protected readonly failed = signal(false);
  protected readonly canImport = computed(
    () => this.validCount() > 0 && this.bookForm().valid() && !this.importing() && this.online(),
  );
  protected readonly importText = computed(() =>
    this.importing() ? this.copy.importing : importLabel(this.validCount()),
  );
  protected readonly nameError = computed(() => {
    const name = this.bookForm.name();
    return name.touched() && name.invalid() ? (name.errors()[0]?.message ?? null) : null;
  });

  protected typeText(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  /** El archivo sustituye al texto y, si el nombre no se tocó, propone el del archivo. */
  protected async loadFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.text.set(await file.text());
    if (!this.bookForm.name().dirty()) {
      this.model.update((value) => ({
        ...value,
        name: file.name.replace(TEXT_FILE_EXTENSION, ''),
      }));
    }
    // Vaciarlo permite volver a cargar el mismo archivo.
    input.value = '';
  }

  protected async importBook(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canImport()) {
      return;
    }
    this.importing.set(true);
    this.failed.set(false);
    try {
      const { name, subject } = this.model();
      const summary = await this.importService.importBook(name, subject, this.preview().parse);
      await this.router.navigate(['/biblioteca', summary.bookId]);
    } catch {
      // El servicio ya registró el detalle; aquí se explica y se deja todo para reintentar.
      this.failed.set(true);
      this.importing.set(false);
    }
  }
}
