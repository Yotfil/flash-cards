// Lógica de negocio de las tarjetas de UN capítulo abierto: orquesta el repositorio de tarjetas, el
// puerto de scheduling (estado FSRS inicial) y BooksService (conteo denormalizado). Expone el estado
// como signals para la UI. No conoce Firestore ni ts-fsrs. El `uid` se resuelve en BooksService /
// AuthService; aquí sólo se usan los puertos.

import { Injectable, inject, signal } from '@angular/core';

import { CardRepository, SchedulingPort } from '@domain/ports';
import type { Card, CardContentDraft } from '@domain/models';
import { AuthService } from './auth.service';
import { BooksService } from './books.service';
import { requireSessionUid } from './session';

/** Estado de carga de las tarjetas, para que la UI elija qué pintar (skeleton/error/lista). */
export type CardsStatus = 'idle' | 'loading' | 'ready' | 'error';

@Injectable({ providedIn: 'root' })
export class CardsService {
  private readonly cardRepository = inject(CardRepository);
  private readonly schedulingPort = inject(SchedulingPort);
  private readonly authService = inject(AuthService);
  private readonly booksService = inject(BooksService);

  private readonly cardsSignal = signal<Card[]>([]);
  private readonly statusSignal = signal<CardsStatus>('idle');
  private readonly errorMessageSignal = signal<string | null>(null);

  readonly cards = this.cardsSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly errorMessage = this.errorMessageSignal.asReadonly();

  /** Carga las tarjetas del capítulo indicado. Maneja el error de forma visible (contrato). */
  async load(chapterId: string): Promise<void> {
    this.statusSignal.set('loading');
    this.errorMessageSignal.set(null);
    try {
      const uid = this.requireUid();
      this.cardsSignal.set(await this.cardRepository.listByChapter(uid, chapterId));
      this.statusSignal.set('ready');
    } catch (error) {
      this.fail('No se pudieron cargar las tarjetas.', error);
    }
  }

  /** Crea una tarjeta `forward` con su scheduling inicial y actualiza el conteo del libro. */
  async create(bookId: string, chapterId: string, draft: CardContentDraft): Promise<void> {
    const uid = this.requireUid();
    const created = await this.cardRepository.create(uid, {
      bookId,
      chapterId,
      // En el MVP cada tarjeta es independiente (solo `forward`, spec §6.10); su `noteId` es propio.
      noteId: crypto.randomUUID(),
      direction: 'forward',
      cardType: draft.cardType,
      front: draft.front,
      back: draft.back,
      scheduling: this.schedulingPort.createInitialScheduling(),
      suspended: false,
    });
    this.cardsSignal.update((cards) => [...cards, created]);
    await this.booksService.changeCardCount(bookId, 1);
  }

  /** Crea muchas tarjetas `forward` de golpe (importación) y actualiza el conteo del libro por el
   *  número realmente creado. */
  async createMany(bookId: string, chapterId: string, drafts: CardContentDraft[]): Promise<void> {
    if (drafts.length === 0) {
      return;
    }
    const uid = this.requireUid();
    const inputs = drafts.map((draft) => ({
      bookId,
      chapterId,
      noteId: crypto.randomUUID(),
      direction: 'forward' as const,
      cardType: draft.cardType,
      front: draft.front,
      back: draft.back,
      scheduling: this.schedulingPort.createInitialScheduling(),
      suspended: false,
    }));
    const created = await this.cardRepository.createMany(uid, inputs);
    this.cardsSignal.update((cards) => [...cards, ...created]);
    await this.booksService.changeCardCount(bookId, created.length);
  }

  /** Edita el contenido (anverso/reverso) de una tarjeta y refleja el cambio en la lista local. */
  async update(cardId: string, draft: CardContentDraft): Promise<void> {
    const uid = this.requireUid();
    await this.cardRepository.update(uid, cardId, draft);
    this.cardsSignal.update((cards) =>
      cards.map((card) =>
        card.id === cardId ? { ...card, ...draft, updatedAt: new Date() } : card,
      ),
    );
  }

  /** Borra una tarjeta, la quita de la lista local y actualiza el conteo del libro. */
  async remove(bookId: string, cardId: string): Promise<void> {
    const uid = this.requireUid();
    await this.cardRepository.delete(uid, cardId);
    this.cardsSignal.update((cards) => cards.filter((card) => card.id !== cardId));
    await this.booksService.changeCardCount(bookId, -1);
  }

  private requireUid(): string {
    return requireSessionUid(this.authService.currentUser());
  }

  private fail(message: string, error: unknown): void {
    console.error(message, error);
    this.errorMessageSignal.set(message);
    this.statusSignal.set('error');
  }
}
