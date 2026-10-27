import { Injectable, inject } from '@angular/core';

import type { Card } from '@domain/models/card.model';
import { CardRepository } from '@domain/ports/card.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { requireSessionUid } from '@services/session/require-session';
import { SessionService } from '@services/session/session.service';

import { selectEligibleCards } from './eligible-cards';
import { generateQuiz } from './generate-quiz';
import { PracticeHandoffService, type PracticeOrigin } from './practice-handoff.service';

/**
 * Lo que dejó preparar un libro: cuántas preguntas entregó y, si fueron 0, si fue porque sin red
 * el dispositivo no tiene ninguna tarjeta del libro (no es lo mismo que un libro sin elegibles).
 */
export interface BookPracticePreparation {
  readonly questions: number;
  readonly nothingOnDevice: boolean;
}

// Preparar una práctica: elegir las tarjetas, armar el quiz y entregarlo a la bandeja de la
// práctica. Devuelve cuántas preguntas entregó (0 = nada que practicar, no se entrega nada).
@Injectable({ providedIn: 'root' })
export class PracticeService {
  private readonly cards = inject(CardRepository);
  private readonly connectivity = inject(ConnectivityPort);
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

  /**
   * Lee el libro (sin red, lo guardado basta) y practica con todo él, también como distractores.
   * Sin red, la lectura devuelve una lista vacía sin error si el dispositivo nunca leyó el libro.
   */
  async prepareBookPractice(bookId: string): Promise<BookPracticePreparation> {
    const uid = requireSessionUid(this.session.user());
    let cards: Card[];
    try {
      cards = await this.cards.listByBook(uid, bookId);
    } catch (error) {
      this.logger.error(`No se pudo leer el libro ${bookId} para practicar`, error);
      throw error;
    }
    return {
      questions: this.hand(cards, { kind: 'book', bookId }),
      nothingOnDevice: cards.length === 0 && !this.connectivity.online(),
    };
  }

  /** Vacía la bandeja de la práctica: lo preparado ya no se va a abrir. */
  discardPrepared(): void {
    this.handoff.take();
  }

  private hand(cards: readonly Card[], origin: PracticeOrigin): number {
    const questions = generateQuiz(selectEligibleCards(cards));
    if (questions.length > 0) {
      this.handoff.hand({ questions, origin });
    }
    return questions.length;
  }
}
