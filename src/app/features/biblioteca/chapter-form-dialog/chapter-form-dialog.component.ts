import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, submit, validateStandardSchema } from '@angular/forms/signals';

import type { Chapter } from '@domain/models/chapter.model';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { ChaptersService } from '@services/chapters/chapters.service';
import { AppDialogRef, DIALOG_DATA } from '@shared/dialog/dialog.service';
import { NEEDS_CONNECTION_MESSAGE } from '@shared/text/connection.copy';

import { BIBLIOTECA_COPY } from '../biblioteca.copy';
import { chapterFormSchema, type ChapterFormValue } from '../chapter-form.schema';

export type ChapterFormDialogData = { mode: 'create' } | { mode: 'rename'; chapter: Chapter };

// Crear un capítulo en el libro abierto o renombrar uno. Se cierra solo con éxito, devolviendo el
// capítulo; si el guardado falla, el error se muestra dentro y el nombre escrito se conserva.
@Component({
  selector: 'app-chapter-form-dialog',
  imports: [FormField],
  templateUrl: './chapter-form-dialog.component.html',
  styleUrl: './chapter-form-dialog.component.scss',
})
export class ChapterFormDialogComponent {
  private readonly data = inject<ChapterFormDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<AppDialogRef<Chapter>>(AppDialogRef);
  private readonly chapters = inject(ChaptersService);
  private readonly logger = inject(Logger);

  protected readonly online = inject(ConnectivityPort).online;
  protected readonly copy = BIBLIOTECA_COPY.chapterForm;
  protected readonly needsConnection = NEEDS_CONNECTION_MESSAGE;
  protected readonly isRename = this.data.mode === 'rename';

  private readonly model = signal<ChapterFormValue>({
    name: this.data.mode === 'rename' ? this.data.chapter.name : '',
  });
  protected readonly chapterForm = form(this.model, (path) =>
    validateStandardSchema(path, chapterFormSchema),
  );
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  protected readonly canSubmit = computed(
    () => this.chapterForm().valid() && !this.saving() && this.online(),
  );
  protected readonly nameError = computed(() => {
    const name = this.chapterForm.name();
    return name.touched() && name.invalid() ? (name.errors()[0]?.message ?? null) : null;
  });

  protected async submitForm(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    await submit(this.chapterForm, async () => {
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
      const { name } = this.model();
      const chapter =
        this.data.mode === 'rename'
          ? await this.chapters.rename(this.data.chapter.id, name)
          : await this.chapters.create(name);
      this.dialogRef.close(chapter);
    } catch (error) {
      this.logger.error(this.copy.saveError, error);
      this.failed.set(true);
      this.saving.set(false);
      this.dialogRef.setPending(false);
    }
  }
}
