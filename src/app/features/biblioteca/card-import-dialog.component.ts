import { Component, computed, input, output, signal } from '@angular/core';

import type { CardContentDraft } from '@domain/models';
import { parseFlashcards } from '@services/import';

/** Diálogo para importar varias tarjetas a un capítulo (spec §5): se pega texto (o se carga un
 *  `.txt`/`.md`) con líneas `anverso | reverso` y se previsualiza antes de confirmar. Presentacional:
 *  parsea en memoria, muestra cuántas tarjetas válidas hay y qué líneas fallan, y al confirmar emite
 *  las tarjetas válidas. El padre escribe en Firestore. Accesible: role="dialog", aria-modal, Escape. */
@Component({
  selector: 'app-card-import-dialog',
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-label="Importar tarjetas"
        [attr.aria-busy]="pending()"
        (keydown.escape)="pending() || cancelled.emit()"
        class="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface-raised p-6 shadow-xl"
      >
        <h2 class="text-lg font-semibold text-text-primary">Importar tarjetas</h2>
        <p class="mt-1 text-sm text-text-secondary">
          Una tarjeta por línea, con anverso y reverso separados por
          <code class="rounded bg-surface-sunken px-1">|</code>. Ej.:
          <code class="rounded bg-surface-sunken px-1">to give up | rendirse</code>.
        </p>

        <label for="import-text" class="sr-only">Tarjetas a importar</label>
        <textarea
          id="import-text"
          rows="8"
          [value]="text()"
          (input)="onInput($event)"
          placeholder="to give up | rendirse&#10;to look after | cuidar"
          class="mt-4 resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-focus-ring"
        ></textarea>

        <div class="mt-3 flex items-center justify-between gap-3">
          <label
            class="cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken"
          >
            Cargar archivo
            <input
              type="file"
              accept=".txt,.md,text/plain"
              class="hidden"
              (change)="onFile($event)"
            />
          </label>
          <p class="text-sm text-text-secondary" aria-live="polite">
            {{ validCount() }} tarjeta(s) válida(s)
          </p>
        </div>

        @if (errors().length > 0) {
          <div class="mt-3 overflow-y-auto rounded-lg border border-border bg-surface-sunken p-3">
            <p class="text-sm font-medium text-text-secondary">
              {{ errors().length }} línea(s) se omitirán:
            </p>
            <ul class="mt-1 flex flex-col gap-0.5 text-xs text-text-muted">
              @for (problem of errors(); track problem.line) {
                <li>Línea {{ problem.line }}: {{ problem.reason }}</li>
              }
            </ul>
          </div>
        }

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            [disabled]="pending()"
            (click)="cancelled.emit()"
            class="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            [disabled]="validCount() === 0 || pending()"
            (click)="confirm()"
            class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            @if (pending()) {
              Importando…
            } @else {
              Importar {{ validCount() }}
            }
          </button>
        </div>
      </div>
    </div>
  `,
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
