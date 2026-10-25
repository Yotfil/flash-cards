import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Chapter } from '@domain/models/chapter.model';
import { ChaptersService } from '@services/chapters/chapters.service';
import { BookReadyCardsService } from '@services/queue/book-ready-cards.service';
import { IconComponent } from '@shared/icon/icon.component';

import { BIBLIOTECA_COPY, chapterDisplayName, chapterReadyLabel } from '../biblioteca.copy';

// Fila de un capítulo en el detalle del libro: el enlace (posición, nombre, "N tarjetas" y "N
// listas") abre el capítulo; al lado, fuera del enlace, renombrar y borrar. Cada número que no se
// pudo obtener (sin red, o si su lectura falla) simplemente no aparece.
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
  private readonly chapterId = computed(() => this.chapter().id);
  protected readonly cardCount = inject(ChaptersService).cardCountFor(this.chapterId);
  private readonly readyCount = inject(BookReadyCardsService).countFor(this.chapterId);
  protected readonly readyLabel = computed(() => {
    const ready = this.readyCount();
    return ready === undefined ? null : chapterReadyLabel(ready);
  });
}
