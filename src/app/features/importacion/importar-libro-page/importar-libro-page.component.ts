import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormField, form, validateStandardSchema } from '@angular/forms/signals';
import { Router } from '@angular/router';

import { ConnectivityPort } from '@domain/ports/connectivity.port';
import {
  importBookFormSchema,
  type ImportBookFormValue,
} from '@services/import/import-book-form.schema';
import {
  DEFAULT_IMPORTED_BOOK_NAME,
  ImportService,
  type ImportBookSummary,
} from '@services/import/import.service';
import { watchSlow } from '@shared/dialog/slow-save';
import {
  IMPORT_WAITS_FOR_CONNECTION_MESSAGE,
  NEEDS_CONNECTION_MESSAGE,
} from '@shared/text/connection.copy';

import { ImportPreviewComponent } from '../import-preview/import-preview.component';
import { IMPORTACION_COPY, importBookLabel } from '../importacion.copy';
import {
  TextFilePickerComponent,
  type LoadedTextFile,
} from '../text-file-picker/text-file-picker.component';

/** Lo que se le quita al nombre de un archivo para proponerlo como nombre del libro. */
const TEXT_FILE_EXTENSION = /\.(txt|md)$/i;

// "Importar un libro": nombre, materia opcional y el texto (pegado o desde un archivo), con la
// previsualización en vivo. Nada se escribe hasta confirmar; si falla, todo queda como estaba.
// La importación vive en el servicio: si el usuario sale mientras importa y vuelve, la página la
// muestra en curso (no ofrece otra) y, al terminar, solo navega al libro si sigue abierta.
@Component({
  selector: 'app-importar-libro-page',
  imports: [FormField, ImportPreviewComponent, TextFilePickerComponent],
  templateUrl: './importar-libro-page.component.html',
  styleUrl: './importar-libro-page.component.scss',
})
export class ImportarLibroPageComponent {
  private readonly importService = inject(ImportService);
  private readonly router = inject(Router);
  private open = true;

  protected readonly online = inject(ConnectivityPort).online;
  protected readonly copy = IMPORTACION_COPY;
  protected readonly needsConnection = NEEDS_CONNECTION_MESSAGE;
  protected readonly waitsForConnection = IMPORT_WAITS_FOR_CONNECTION_MESSAGE;
  /** La importación lleva el plazo sin confirmar (wifi sin internet): se avisa sin prometer. */
  protected readonly slow = signal(false);

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
  private readonly chapterCount = computed(() => this.preview().parse.chapterCount);
  protected readonly importing = computed(() => this.importService.bookImport() !== null);
  protected readonly failed = signal(false);
  /** Hay algo que importar: tarjetas, o al menos capítulos (el esqueleto de un libro). */
  protected readonly canImport = computed(
    () =>
      (this.validCount() > 0 || this.chapterCount() > 0) &&
      this.bookForm().valid() &&
      !this.importing() &&
      this.online(),
  );
  protected readonly importText = computed(() =>
    this.importing()
      ? this.copy.importing
      : importBookLabel(this.validCount(), this.chapterCount()),
  );
  protected readonly nameError = computed(() => {
    const name = this.bookForm.name();
    return name.touched() && name.invalid() ? (name.errors()[0]?.message ?? null) : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.open = false));
    const inFlight = this.importService.bookImport();
    if (inFlight) {
      this.model.set({ name: inFlight.name, subject: inFlight.subject });
      this.text.set(inFlight.text);
      void this.follow(inFlight.done);
    }
  }

  protected typeText(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  /** El archivo sustituye al texto y, si el nombre no se tocó, propone el del archivo. */
  protected loadFile(file: LoadedTextFile): void {
    this.text.set(file.text);
    if (!this.bookForm.name().dirty()) {
      this.model.update((value) => ({
        ...value,
        name: file.name.replace(TEXT_FILE_EXTENSION, ''),
      }));
      // Un nombre propuesto que no vale (más de 120 caracteres) se marca para que se vea el motivo
      // y no quede "Importar" deshabilitado sin explicación.
      this.bookForm.name().markAsTouched();
    }
  }

  protected async importBook(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canImport()) {
      return;
    }
    const { name, subject } = this.model();
    await this.follow(this.importService.importBook({ name, subject, text: this.text() }));
  }

  /** Espera la importación y, si la página sigue abierta, lleva al libro o explica el fallo. */
  private async follow(done: Promise<ImportBookSummary>): Promise<void> {
    this.failed.set(false);
    const stopWatching = watchSlow(() => this.slow.set(true));
    try {
      const summary = await done;
      if (this.open) {
        await this.router.navigate(['/biblioteca', summary.bookId]);
      }
    } catch {
      // El servicio ya registró el detalle; aquí se explica y se deja todo para reintentar.
      this.failed.set(true);
    } finally {
      stopWatching();
      this.slow.set(false);
    }
  }
}
