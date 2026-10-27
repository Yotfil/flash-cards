import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, submit, validateStandardSchema } from '@angular/forms/signals';

import type { PracticePackage } from '@domain/models/practice-package';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import {
  packageFormSchema,
  type PackageFormValue,
} from '@services/practice-ai/package-form.schema';
import { PracticePackagesService } from '@services/practice-ai/practice-packages.service';
import { AppDialogRef, DIALOG_DATA } from '@shared/dialog/dialog.service';
import {
  CLOSE_LABEL,
  NEEDS_CONNECTION_MESSAGE,
  SAVED_ON_DEVICE_MESSAGE,
} from '@shared/text/connection.copy';

import { PRACTICA_IA_COPY } from '../practica-ia.copy';

export type PackageFormDialogData = { mode: 'create' } | { mode: 'rename'; pkg: PracticePackage };

// Crear un paquete o cambiarle el nombre. Se cierra solo con éxito (con el paquete, al crear); si
// el guardado falla, el error se muestra dentro y lo escrito se conserva.
@Component({
  selector: 'app-package-form-dialog',
  imports: [FormField],
  templateUrl: './package-form-dialog.component.html',
  styleUrl: './package-form-dialog.component.scss',
})
export class PackageFormDialogComponent {
  private readonly data = inject<PackageFormDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<AppDialogRef<PracticePackage>>(AppDialogRef);
  private readonly packages = inject(PracticePackagesService);
  private readonly logger = inject(Logger);

  protected readonly online = inject(ConnectivityPort).online;
  protected readonly copy = PRACTICA_IA_COPY.packageForm;
  protected readonly needsConnection = NEEDS_CONNECTION_MESSAGE;
  protected readonly savedOnDevice = SAVED_ON_DEVICE_MESSAGE;
  protected readonly closeLabel = CLOSE_LABEL;
  /** Pasado el plazo sin confirmar: lo escrito ya está en el dispositivo y se deja cerrar. */
  protected readonly savingTooLong = this.dialogRef.savingTooLong;
  protected readonly isRename = this.data.mode === 'rename';

  private readonly model = signal<PackageFormValue>({
    name: this.data.mode === 'rename' ? this.data.pkg.name : '',
  });
  protected readonly packageForm = form(this.model, (path) =>
    validateStandardSchema(path, packageFormSchema),
  );
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  protected readonly canSubmit = computed(
    () => this.packageForm().valid() && !this.saving() && this.online(),
  );
  protected readonly nameError = computed(() => {
    const name = this.packageForm.name();
    return name.touched() && name.invalid() ? (name.errors()[0]?.message ?? null) : null;
  });

  protected async submitForm(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    await submit(this.packageForm, async () => {
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
      if (this.data.mode === 'rename') {
        await this.packages.rename(this.data.pkg.id, this.model().name);
        this.dialogRef.close();
      } else {
        this.dialogRef.close(await this.packages.create(this.model().name));
      }
    } catch (error) {
      this.logger.error(this.copy.saveError, error);
      this.failed.set(true);
      this.saving.set(false);
      this.dialogRef.setPending(false);
    }
  }
}
