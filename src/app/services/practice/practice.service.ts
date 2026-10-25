import { Injectable, inject } from '@angular/core';

import type { Card } from '@domain/models/card.model';
import { CardRepository } from '@domain/ports/card.repository';
import { Logger } from '@domain/ports/logger.port';
import { requireSessionUid } from '@services/session/require-session';
import { SessionService } from '@services/session/session.service';

import { selectEligibleCards } from './eligible-cards';
import { generateQuiz } from './generate-quiz';
import { PracticeHandoffService, type PracticeOrigin } from './practice-handoff.service';

// Preparar una práctica: elegir las tarjetas, armar el quiz y entregarlo a la bandeja de la
// práctica. Devuelve cuántas preguntas entregó (0 = nada que practicar, no se entrega nada).
@Injectable({ providedIn: 'root' })
export class PracticeService {
  private readonly cards = inject(CardRepository);
  private readonly session = inject(SessionService);
  private readonly handoff = inject(PracticeHandoffService);
  private readonly logger = inject(Logger);

  /** Con las tarjetas que el capítulo ya cargó: cero lecturas. */
  async prepareChapterPractice(
    cards: readonly Card[],
    origin: Extract<PracticeOrigin, { kind: 'chapter' }>,
  ): Promise<number> {
    return this.hand(cards, origin);
  }

  /** Lee el libro (sin red, lo guardado basta) y practica con todo él, también como distractores. */
  async prepareBookPractice(bookId: string): Promise<number> {
    const uid = requireSessionUid(this.session.user());
    let cards: Card[];
    try {
      cards = await this.cards.listByBook(uid, bookId);
    } catch (error) {
      this.logger.error(`No se pudo leer el libro ${bookId} para practicar`, error);
      throw error;
    }
    return this.hand(cards, { kind: 'book', bookId });
  }

  private hand(cards: readonly Card[], origin: PracticeOrigin): number {
    const questions = generateQuiz(selectEligibleCards(cards));
    if (questions.length > 0) {
      this.handoff.hand({ questions, origin });
    }
    return questions.length;
  }
}
