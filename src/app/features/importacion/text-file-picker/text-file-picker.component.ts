import { Component, inject, output, signal } from '@angular/core';

import { Logger } from '@domain/ports/logger.port';

import { IMPORTACION_COPY } from '../importacion.copy';

/** Un archivo de texto ya leído. */
export interface LoadedTextFile {
  readonly name: string;
  readonly text: string;
}

// "Cargar archivo" de la importación (la página y el diálogo): una etiqueta que hace de botón sobre
// el selector de archivos oculto, con el anillo de foco cuando se llega con el teclado. Lee el texto
// y lo entrega; si no se puede leer (p. ej. un archivo en la nube sin descargar, sin red), lo dice
// aquí mismo y lo registra.
@Component({
  selector: 'app-text-file-picker',
  templateUrl: './text-file-picker.component.html',
  styleUrl: './text-file-picker.component.scss',
})
export class TextFilePickerComponent {
  readonly loaded = output<LoadedTextFile>();

  private readonly logger = inject(Logger);

  protected readonly copy = IMPORTACION_COPY;
  protected readonly readFailed = signal(false);

  protected async load(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      this.readFailed.set(false);
      this.loaded.emit({ name: file.name, text });
    } catch (error) {
      this.logger.error('No se pudo leer el archivo elegido', error);
      this.readFailed.set(true);
    } finally {
      // Vaciarlo permite volver a cargar el mismo archivo.
      input.value = '';
    }
  }
}
