import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ImportService, parseFlashcards } from '@services/import';

/** Pantalla "Importar un libro" (spec §5/§8.4): subir o pegar un `.txt`/`.md` con la convención de
 *  importación, previsualizar (capítulos, tarjetas válidas, líneas problemáticas) y, al confirmar,
 *  crear un libro nuevo con todo su contenido. Sólo pinta y captura eventos; la escritura la hace
 *  ImportService. */
@Component({
  selector: 'app-importar-libro',
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-2xl px-6 py-6">
      <a
        routerLink="/biblioteca"
        class="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        ← Biblioteca
      </a>

      <h1 class="mt-3 text-2xl font-semibold text-text-primary">Importar un libro</h1>
      <p class="mt-1 text-sm text-text-secondary">
        Cada <code class="rounded bg-surface-sunken px-1">#</code> es un capítulo; cada línea
        <code class="rounded bg-surface-sunken px-1">anverso | reverso</code> es una tarjeta. Un
        archivo = un libro.
      </p>

      @if (errorMessage(); as message) {
        <p
          role="alert"
          class="mt-4 rounded-lg border border-border bg-surface-sunken px-4 py-2.5 text-sm text-text-secondary"
        >
          {{ message }}
        </p>
      }

      <div class="mt-5 flex flex-col gap-1.5">
        <label for="book-name" class="text-sm font-medium text-text-secondary"
          >Nombre del libro</label
        >
        <input
          id="book-name"
          type="text"
          [value]="bookName()"
          (input)="onName($event)"
          autocomplete="off"
          placeholder="Ej. Phrasal Verbs"
          class="rounded-lg border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-focus-ring"
        />
      </div>

      <div class="mt-4 flex flex-col gap-1.5">
        <label for="import-text" class="text-sm font-medium text-text-secondary">Contenido</label>
        <textarea
          id="import-text"
          rows="10"
          [value]="text()"
          (input)="onText($event)"
          placeholder="# Capítulo 1&#10;to give up | rendirse&#10;to look after | cuidar"
          class="resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-focus-ring"
        ></textarea>
        <label
          class="mt-1 inline-flex w-fit cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken"
        >
          Cargar archivo
          <input
            type="file"
            accept=".txt,.md,text/plain"
            class="hidden"
            (change)="onFile($event)"
          />
        </label>
      </div>

      <div class="mt-5 rounded-2xl border border-border bg-surface-raised p-5">
        <p class="text-sm font-medium text-text-primary">Previsualización</p>
        <p class="mt-1 text-sm text-text-secondary">
          {{ chapterCount() }} capítulo(s) · {{ validCount() }} tarjeta(s) válida(s)
        </p>
        @if (errors().length > 0) {
          <div class="mt-3 max-h-40 overflow-y-auto rounded-lg bg-surface-sunken p-3">
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
      </div>

      <div class="mt-6 flex justify-end gap-3">
        <button
          type="button"
          [disabled]="importing()"
          routerLink="/biblioteca"
          class="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          [disabled]="validCount() === 0 || importing()"
          (click)="confirm()"
          class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          @if (importing()) {
            Importando…
          } @else {
            Importar libro
          }
        </button>
      </div>
    </section>
  `,
})
export class ImportarLibroComponent {
  private readonly importService = inject(ImportService);
  private readonly router = inject(Router);

  protected readonly bookName = signal('');
  protected readonly text = signal('');
  protected readonly importing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  // El usuario editó el nombre a mano: no lo sobreescribimos al cargar un archivo.
  private nameTouched = false;

  private readonly parseResult = computed(() =>
    parseFlashcards(this.text(), this.bookName().trim() || 'Libro importado'),
  );
  protected readonly chapterCount = computed(() => this.parseResult().chapters.length);
  protected readonly validCount = computed(() => this.parseResult().validCardCount);
  protected readonly errors = computed(() => this.parseResult().errors);

  protected onName(event: Event): void {
    this.nameTouched = true;
    this.bookName.set((event.target as HTMLInputElement).value);
  }

  protected onText(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.text.set(await file.text());
      if (!this.nameTouched) {
        this.bookName.set(file.name.replace(/\.(txt|md)$/i, ''));
      }
    }
    input.value = '';
  }

  protected async confirm(): Promise<void> {
    if (this.importing() || this.validCount() === 0) {
      return;
    }
    this.errorMessage.set(null);
    this.importing.set(true);
    try {
      const summary = await this.importService.importBook(this.bookName(), this.parseResult());
      await this.router.navigate(['/biblioteca', summary.bookId]);
    } catch (error) {
      console.error('No se pudo importar el libro', error);
      this.errorMessage.set('No se pudo importar el libro. Inténtalo de nuevo.');
    } finally {
      this.importing.set(false);
    }
  }
}
