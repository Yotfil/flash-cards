import { Component, computed, input } from '@angular/core';

import type { ImportPreview } from '@services/import/import.service';
import { IconComponent } from '@shared/icon/icon.component';

import { IMPORTACION_COPY, countsLine, omittedHeading, omittedLine } from '../importacion.copy';

// Lo que entrará antes de guardar nada: capítulos, tarjetas y repetidas, y qué líneas se omiten y
// por qué. La comparten la página de importar un libro y el diálogo de importar tarjetas. Sólida:
// es la pantalla que se lee con atención.
@Component({
  selector: 'app-import-preview',
  imports: [IconComponent],
  templateUrl: './import-preview.component.html',
  styleUrl: './import-preview.component.scss',
})
export class ImportPreviewComponent {
  readonly preview = input.required<ImportPreview>();
  /** Al importar un libro se cuentan los capítulos; en un capítulo, no. */
  readonly showChapters = input(true);

  protected readonly copy = IMPORTACION_COPY;
  protected readonly counts = computed(() =>
    countsLine(
      {
        chapters: this.preview().parse.chapterCount,
        cards: this.preview().parse.validCardCount,
        repeated: this.preview().repeatedCount,
      },
      this.showChapters(),
    ),
  );
  protected readonly omitted = computed(() =>
    this.preview().parse.errors.map((error) => omittedLine(error.line, error.reason)),
  );
  protected readonly omittedTitle = computed(() => omittedHeading(this.omitted().length));
}
