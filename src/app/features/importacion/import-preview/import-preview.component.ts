import { Component, computed, input } from '@angular/core';

import type { ImportPreview } from '@services/import/import.service';
import { IconComponent } from '@shared/icon/icon.component';
import { andMore, limitList } from '@shared/text/limited-list';

import {
  CARD_WORDING,
  IMPORTACION_COPY,
  countsLine,
  omittedHeading,
  omittedLine,
  type PreviewWording,
} from '../importacion.copy';

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
  readonly wording = input<PreviewWording>(CARD_WORDING);

  protected readonly copy = IMPORTACION_COPY;
  protected readonly counts = computed(() =>
    countsLine(
      {
        chapters: this.preview().parse.chapterCount,
        cards: this.preview().parse.validCardCount,
        repeated: this.preview().repeatedCount,
      },
      this.showChapters(),
      this.wording(),
    ),
  );
  /** Solo las primeras: un archivo equivocado de miles de líneas no debe congelar la pantalla. */
  private readonly limitedErrors = computed(() => limitList(this.preview().parse.errors));
  protected readonly omitted = computed(() =>
    this.limitedErrors().shown.map((error) => omittedLine(error.line, error.reason)),
  );
  protected readonly omittedMore = computed(() => {
    const hidden = this.limitedErrors().hiddenCount;
    return hidden > 0 ? andMore(hidden) : null;
  });
  protected readonly omittedTitle = computed(() =>
    omittedHeading(this.preview().parse.errors.length),
  );
}
