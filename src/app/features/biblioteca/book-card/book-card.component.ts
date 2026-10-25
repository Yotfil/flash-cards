import { Component, computed, input, output } from '@angular/core';

import type { Book } from '@domain/models/book.model';
import { IconComponent } from '@shared/icon/icon.component';

import { BIBLIOTECA_COPY } from '../biblioteca.copy';

// Tarjeta de un libro en la Biblioteca (acrílico suave, segunda capa junto a la navegación). La
// zona principal abre el libro; los dos botones de icono, nombrados con el libro, piden sus ajustes
// o su borrado. Solo emite: la pantalla decide qué hacer.
@Component({
  selector: 'app-book-card',
  imports: [IconComponent],
  templateUrl: './book-card.component.html',
  styleUrl: './book-card.component.scss',
})
export class BookCardComponent {
  readonly book = input.required<Book>();
  readonly opened = output<void>();
  readonly settingsRequested = output<void>();
  readonly deleteRequested = output<void>();

  protected readonly copy = BIBLIOTECA_COPY;
  protected readonly cards = computed(() => this.copy.cards(this.book().cardCount ?? 0));
  protected readonly newPerDay = computed(() => this.copy.newPerDay(this.book().newCardsPerDay));
}
