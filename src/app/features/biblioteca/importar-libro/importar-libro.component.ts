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
  templateUrl: './importar-libro.component.html',
  styleUrl: './importar-libro.component.scss',
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
