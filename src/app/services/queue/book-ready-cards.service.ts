import { Injectable, computed, inject, resource, signal, type Signal } from '@angular/core';

import type { Card } from '@domain/models/card.model';
import { CardRepository } from '@domain/ports/card.repository';
import { CardsService } from '@services/cards/cards.service';
import { requireSessionUid, requireSessionUser } from '@services/session/require-session';
import { SessionService } from '@services/session/session.service';
import { studyDayAt, type StudyDay } from '@services/study-day/study-day';

import { countReadyByChapter, orderReadyCards } from './ready-cards';

// Tarjetas listas de un libro, con la definición única de "lista" y SIN los topes diarios: el
// detalle del libro cuenta las de cada capítulo y "Estudiar este libro" / "Estudiar este capítulo"
// preparan sus sesiones. Mismo patrón que `ChaptersService.openBook` + `cardCountFor`.
@Injectable({ providedIn: 'root' })
export class BookReadyCardsService {
  private readonly session = inject(SessionService);
  private readonly repository = inject(CardRepository);
  private readonly cards = inject(CardsService);

  private readonly opened = signal<{ bookId: string; day: StudyDay } | null>(null);

  readonly ready = resource({
    params: () => this.opened() ?? undefined,
    loader: ({ params }) =>
      this.repository.listReadyByBook(
        requireSessionUid(this.session.user()),
        params.bookId,
        params.day.endOfDay,
      ),
  });

  private readonly countsByChapter = computed(() => {
    const opened = this.opened();
    return opened && this.ready.hasValue()
      ? countReadyByChapter(this.ready.value(), opened.day.endOfDay)
      : null;
  });

  /** Abre (o relee) las listas de un libro con el día de estudio de ahora. */
  openBook(bookId: string): void {
    this.opened.set({ bookId, day: this.currentDay() });
  }

  /** Listas de un capítulo del libro abierto; `undefined` mientras carga o si la lectura falló. */
  countFor(chapterId: Signal<string>): Signal<number | undefined> {
    return computed(() => {
      const counts = this.countsByChapter();
      return counts ? (counts.get(chapterId()) ?? 0) : undefined;
    });
  }

  /** Todas las listas del libro, en orden de estudio, con una lectura fresca. */
  async prepareBookSession(bookId: string): Promise<Card[]> {
    const uid = requireSessionUid(this.session.user());
    const { endOfDay } = this.currentDay();
    return orderReadyCards(await this.repository.listReadyByBook(uid, bookId, endOfDay), endOfDay);
  }

  /**
   * Las listas del capítulo desde las tarjetas que su detalle ya cargó: cero lecturas, así funciona
   * sin red. Si esas tarjetas no están cargadas, falla (la pantalla lo muestra como error).
   */
  async prepareChapterSession(chapterId: string): Promise<Card[]> {
    if (!this.cards.cards.hasValue()) {
      throw new Error(`Las tarjetas del capítulo ${chapterId} no están cargadas.`);
    }
    const chapterCards = this.cards.cards.value().filter((card) => card.chapterId === chapterId);
    return orderReadyCards(chapterCards, this.currentDay().endOfDay);
  }

  private currentDay(): StudyDay {
    const { timezone, dayStartHour } = requireSessionUser(this.session.user()).settings;
    return studyDayAt(new Date(), timezone, dayStartHour);
  }
}
