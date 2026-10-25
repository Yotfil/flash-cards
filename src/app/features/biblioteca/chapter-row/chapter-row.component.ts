import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Chapter } from '@domain/models/chapter.model';
import { ChaptersService } from '@services/chapters/chapters.service';
import { IconComponent } from '@shared/icon/icon.component';

import { BIBLIOTECA_COPY, chapterDisplayName } from '../biblioteca.copy';

// Fila de un capítulo en el detalle del libro: el enlace (posición, nombre y "N tarjetas") abre el
// capítulo; al lado, fuera del enlace, renombrar y borrar. El conteo va al servidor: sin red o si
// falla, la línea simplemente no aparece.
@Component({
  selector: 'app-chapter-row',
  imports: [RouterLink, IconComponent],
  templateUrl: './chapter-row.component.html',
  styleUrl: './chapter-row.component.scss',
})
export class ChapterRowComponent {
  readonly chapter = input.required<Chapter>();
  readonly position = input.required<number>();
  readonly bookId = input.required<string>();
  readonly renameRequested = output<void>();
  readonly deleteRequested = output<void>();

  protected readonly copy = BIBLIOTECA_COPY;
  protected readonly name = computed(() => chapterDisplayName(this.chapter()));
  protected readonly cardCount = inject(ChaptersService).cardCountFor(
    computed(() => this.chapter().id),
  );
}
