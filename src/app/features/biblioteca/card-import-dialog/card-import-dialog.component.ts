import { Component, computed, input, output, signal } from '@angular/core';

import type { CardContentDraft } from '@domain/models';
import { parseFlashcards } from '@services/import';

/** Diálogo para importar varias tarjetas a un capítulo (spec §5): se pega texto (o se carga un
 *  `.txt`/`.md`) con líneas `anverso | reverso` y se previsualiza antes de confirmar. Presentacional:
 *  parsea en memoria, muestra cuántas tarjetas válidas hay y qué líneas fallan, y al confirmar emite
 *  las tarjetas válidas. El padre escribe en Firestore. Accesible: role="dialog", aria-modal, Escape. */
@Component({
  selector: 'app-card-import-dialog',
  templateUrl: './card-import-dialog.component.html',
  styleUrl: './card-import-dialog.component.scss',
})
export class CardImportDialogComponent {
  /** Nombre del capítulo destino; sirve de capítulo por defecto del parser (las tarjetas se aplanan). */
  readonly defaultChapterName = input('');
  /** El padre lo pone en true mientras importa; bloquea botones y reenvíos. */
  readonly pending = input(false);
  readonly imported = output<CardContentDraft[]>();
  readonly cancelled = output<void>();

  protected readonly text = signal('');

  private readonly parseResult = computed(() =>
    parseFlashcards(this.text(), this.defaultChapterName()),
  );
  protected readonly validCount = computed(() => this.parseResult().validCardCount);
  protected readonly errors = computed(() => this.parseResult().errors);

  protected onInput(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
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
    this.imported.emit(cards);
  }
}
