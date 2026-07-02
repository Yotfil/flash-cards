import { Component, computed, input, output, signal } from '@angular/core';

import type { CardContentDraft } from '@domain/models';
import { parseFlashcards } from '@services/import';
import { ModalComponent } from '@shared/modal/modal.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

/** Qué hacer con las tarjetas que ya existen en el capítulo al importar. */
export type CardImportMode = 'append' | 'replace';

/** Lo que emite el diálogo al confirmar: las tarjetas parseadas y el modo elegido. */
export interface CardImportRequest {
  drafts: CardContentDraft[];
  mode: CardImportMode;
}

/** Diálogo para importar varias tarjetas a un capítulo (spec §5): se pega texto (o se carga un
 *  `.txt`/`.md`) con líneas `anverso | reverso` y se previsualiza antes de confirmar. El usuario
 *  elige si las importadas se AGREGAN a las existentes (default) o las REEMPLAZAN todas; reemplazar
 *  es destructivo, así que pide una confirmación extra que avisa de la pérdida de progreso.
 *  Presentacional: parsea en memoria, muestra cuántas tarjetas válidas hay y qué líneas fallan, y
 *  al confirmar emite las tarjetas válidas + el modo; el padre persiste (vía CardsService). El
 *  cascarón accesible (role="dialog", aria-modal, Escape) lo pone ModalComponent. */
@Component({
  selector: 'app-card-import-dialog',
  imports: [ModalComponent, ConfirmDialogComponent],
  templateUrl: './card-import-dialog.component.html',
  styleUrl: './card-import-dialog.component.scss',
})
export class CardImportDialogComponent {
  /** Nombre del capítulo destino; sirve de capítulo por defecto del parser (las tarjetas se aplanan). */
  readonly defaultChapterName = input('');
  /** Cuántas tarjetas tiene hoy el capítulo; personaliza el aviso del modo "reemplazar". */
  readonly existingCardCount = input(0);
  /** El padre lo pone en true mientras importa; bloquea botones y reenvíos. */
  readonly pending = input(false);
  readonly imported = output<CardImportRequest>();
  readonly cancelled = output<void>();

  // Ejemplo cloze como texto plano (evita escapar `{{ }}` en la plantilla).
  protected readonly clozeExample = 'El {{gato}} es {{negro}}';

  protected readonly text = signal('');
  protected readonly mode = signal<CardImportMode>('append');
  /** Confirmación extra del modo "reemplazar" (acción destructiva) abierta. */
  protected readonly showReplaceConfirm = signal(false);

  private readonly parseResult = computed(() =>
    parseFlashcards(this.text(), this.defaultChapterName()),
  );
  protected readonly validCount = computed(() => this.parseResult().validCardCount);
  protected readonly errors = computed(() => this.parseResult().errors);

  protected readonly replaceWarning = computed(() => {
    const count = this.existingCardCount();
    const cardsPhrase =
      count === 1
        ? 'Se borrará la tarjeta actual del capítulo y se perderá su'
        : `Se borrarán las ${count} tarjetas actuales del capítulo y se perderá su`;
    return (
      `${cardsPhrase} historial y progreso de estudio. Si quieres conservar el progreso, ` +
      'mejor edita cada tarjeta con su botón "Editar".'
    );
  });

  protected onInput(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  protected onModeChange(mode: CardImportMode): void {
    this.mode.set(mode);
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.text.set(await file.text());
    }
    input.value = ''; // permite volver a cargar el mismo archivo si hace falta
  }

  protected confirm(): void {
    if (this.pending()) {
      return;
    }
    const cards = this.parseResult().chapters.flatMap((chapter) => chapter.cards);
    if (cards.length === 0) {
      return;
    }
    // Reemplazar borra tarjetas con progreso: no se emite sin una confirmación explícita.
    // (Con el capítulo vacío no hay nada que borrar, así que no se molesta al usuario.)
    if (this.mode() === 'replace' && this.existingCardCount() > 0) {
      this.showReplaceConfirm.set(true);
      return;
    }
    this.imported.emit({ drafts: cards, mode: this.mode() });
  }

  protected confirmReplace(): void {
    const cards = this.parseResult().chapters.flatMap((chapter) => chapter.cards);
    this.imported.emit({ drafts: cards, mode: 'replace' });
  }

  protected cancelReplace(): void {
    this.showReplaceConfirm.set(false);
  }
}
