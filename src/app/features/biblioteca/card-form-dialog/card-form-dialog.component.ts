import { Component, computed, inject, signal, type Signal } from '@angular/core';
import { FormField, form, submit, validateStandardSchema } from '@angular/forms/signals';

import type { Card, CardType } from '@domain/models/card.model';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { isDuplicateDraft } from '@services/cards/card-duplicates';
import { CardsService } from '@services/cards/cards.service';
import { AppDialogRef, DIALOG_DATA } from '@shared/dialog/dialog.service';
import { NEEDS_CONNECTION_MESSAGE } from '@shared/text/connection.copy';

import { BIBLIOTECA_COPY } from '../biblioteca.copy';
import { cardFormSchema, type CardFormValue } from '@services/cards/card-form.schema';

export type CardFormDialogData =
  | { mode: 'create'; bookId: string; chapterId: string; chapterCards: Signal<Card[]> }
  | { mode: 'edit'; card: Card };

// Crear una tarjeta en el capítulo abierto o editar su contenido. Se cierra solo con éxito,
// devolviendo la tarjeta; si el guardado falla, el error se muestra dentro y el texto se conserva.
@Component({
  selector: 'app-card-form-dialog',
  imports: [FormField],
  templateUrl: './card-form-dialog.component.html',
  styleUrl: './card-form-dialog.component.scss',
})
export class CardFormDialogComponent {
  private readonly data = inject<CardFormDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<AppDialogRef<Card>>(AppDialogRef);
  private readonly cards = inject(CardsService);
  private readonly logger = inject(Logger);

  protected readonly online = inject(ConnectivityPort).online;
  protected readonly copy = BIBLIOTECA_COPY.cardForm;
  protected readonly needsConnection = NEEDS_CONNECTION_MESSAGE;
  protected readonly isEdit = this.data.mode === 'edit';

  private readonly model = signal<CardFormValue>(initialValue(this.data));
  protected readonly cardForm = form(this.model, (path) =>
    validateStandardSchema(path, cardFormSchema),
  );
  protected readonly isCloze = computed(() => this.model().cardType === 'cloze');
  // Plegado salvo que la tarjeta ya tenga ejemplo: así no se esconde contenido existente.
  protected readonly showMore = signal(this.data.mode === 'edit' && !!this.data.card.example);
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  protected readonly canSubmit = computed(
    () => this.cardForm().valid() && !this.saving() && this.online(),
  );
  // Solo avisa: repetir una tarjeta es legítimo (p. ej. otra acepción), así que no bloquea.
  protected readonly isDuplicate = computed(() => {
    if (this.data.mode !== 'create') {
      return false;
    }
    const { front, back } = this.model();
    return isDuplicateDraft({ front, back: this.isCloze() ? '' : back }, this.data.chapterCards());
  });
  protected readonly frontError = computed(() => {
    const front = this.cardForm.front();
    return front.touched() && front.invalid() ? (front.errors()[0]?.message ?? null) : null;
  });
  protected readonly backError = computed(() => {
    const back = this.cardForm.back();
    return back.touched() && back.invalid() ? (back.errors()[0]?.message ?? null) : null;
  });
  protected readonly exampleError = computed(() => {
    const example = this.cardForm.example();
    return example.touched() && example.invalid() ? (example.errors()[0]?.message ?? null) : null;
  });

  protected chooseType(cardType: CardType): void {
    this.model.update((value) => ({ ...value, cardType }));
  }

  protected toggleMore(): void {
    this.showMore.update((shown) => !shown);
  }

  protected async submitForm(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    await submit(this.cardForm, async () => {
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
      const draft = this.model();
      const card =
        this.data.mode === 'edit'
          ? await this.cards.update(this.data.card.id, draft)
          : await this.cards.create(this.data.bookId, this.data.chapterId, draft);
      this.dialogRef.close(card);
    } catch (error) {
      this.logger.error(this.copy.saveError, error);
      this.failed.set(true);
      this.saving.set(false);
      this.dialogRef.setPending(false);
    }
  }
}

function initialValue(data: CardFormDialogData): CardFormValue {
  if (data.mode === 'create') {
    return { cardType: 'basic', front: '', back: '', example: '' };
  }
  const { card } = data;
  return {
    cardType: card.cardType ?? 'basic',
    front: card.front,
    back: card.back,
    example: card.example ?? '',
  };
}
