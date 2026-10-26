import { Injectable, computed, inject, resource, signal } from '@angular/core';

import { initialCardScheduling } from '@domain/models/card-scheduling';
import type {
  Card,
  CardContentChanges,
  CardContentDraft,
  NewCard,
} from '@domain/models/card.model';
import { PartialDeletionError } from '@domain/models/partial-deletion-error';
import { CardRepository } from '@domain/ports/card.repository';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { requireSessionUid } from '@services/session/require-session';
import { SessionService } from '@services/session/session.service';

import { findDuplicateCardIds } from './card-duplicates';
import { sortCardsForDisplay } from './sort-cards-for-display';

// Tarjetas del capítulo abierto. La lista es un recurso que el detalle del capítulo relee en cada
// apertura; el orden de visualización y las repetidas se derivan de ella. Las mutaciones actualizan
// la lista local tras el éxito en el almacén; los mensajes para el usuario los elige la pantalla.
@Injectable({ providedIn: 'root' })
export class CardsService {
  private readonly repository = inject(CardRepository);
  private readonly session = inject(SessionService);
  private readonly books = inject(BooksService);
  private readonly logger = inject(Logger);

  private readonly chapterId = signal<string | undefined>(undefined);

  readonly cards = resource({
    params: () => this.chapterId(),
    loader: async ({ params }) => {
      try {
        return await this.repository.listByChapter(requireSessionUid(this.session.user()), params);
      } catch (error) {
        // La pantalla pinta el error; aquí queda el detalle (p. ej. qué documento rechazó la frontera).
        this.logger.error(`No se pudieron leer las tarjetas del capítulo ${params}`, error);
        throw error;
      }
    },
  });

  private readonly loaded = computed(() => (this.cards.hasValue() ? this.cards.value() : []));
  readonly sorted = computed(() => sortCardsForDisplay(this.loaded()));
  readonly duplicateIds = computed(() => findDuplicateCardIds(this.loaded()));

  /** Abre (o relee) las tarjetas de un capítulo. */
  openChapter(chapterId: string): void {
    if (this.chapterId() === chapterId) {
      this.cards.reload();
    } else {
      this.chapterId.set(chapterId);
    }
  }

  /** Crea una tarjeta nueva, lista para estudiar, y la suma al libro. */
  async create(bookId: string, chapterId: string, draft: CardContentDraft): Promise<Card> {
    const uid = requireSessionUid(this.session.user());
    const card = await this.repository.create(uid, toNewCard(bookId, chapterId, draft, new Date()));
    this.cards.update((cards) => [...(cards ?? []), card]);
    this.books.changeCardCount(bookId, 1);
    return card;
  }

  /** Crea varias de golpe (importación). Una lista vacía no escribe nada. */
  async createMany(
    bookId: string,
    chapterId: string,
    drafts: readonly CardContentDraft[],
  ): Promise<Card[]> {
    if (drafts.length === 0) {
      return [];
    }
    const uid = requireSessionUid(this.session.user());
    const now = new Date();
    const created = await this.repository.createMany(
      uid,
      drafts.map((draft) => toNewCard(bookId, chapterId, draft, now)),
    );
    if (this.chapterId() === chapterId) {
      this.cards.update((cards) => [...(cards ?? []), ...created]);
    }
    this.books.changeCardCount(bookId, created.length);
    return created;
  }

  /**
   * Reemplaza todas las tarjetas cargadas del capítulo por nuevas (importar en modo "reemplazar").
   * El almacén lo hace en una sola operación si cabe en un lote; la lista y el contador del libro
   * solo cambian tras el éxito.
   */
  async replaceAll(
    bookId: string,
    chapterId: string,
    drafts: readonly CardContentDraft[],
  ): Promise<Card[]> {
    const uid = requireSessionUid(this.session.user());
    const current = this.cards.hasValue() ? this.cards.value() : [];
    const now = new Date();
    const created = await this.repository.replaceInChapter(
      uid,
      bookId,
      chapterId,
      current.map((card) => card.id),
      drafts.map((draft) => toNewCard(bookId, chapterId, draft, now)),
    );
    this.cards.set(created);
    this.books.changeCardCount(bookId, created.length - current.length);
    return created;
  }

  /** Cambia solo el contenido; la programación y la suspensión se conservan. */
  async update(cardId: string, draft: CardContentDraft): Promise<Card> {
    const uid = requireSessionUid(this.session.user());
    const changes = toContentChanges(draft);
    await this.repository.updateContent(uid, cardId, changes);
    let updated: Card | undefined;
    this.cards.update((cards) =>
      cards?.map((card) => {
        if (card.id !== cardId) {
          return card;
        }
        updated = applyContentChanges(card, changes);
        return updated;
      }),
    );
    if (!updated) {
      throw new Error(`La tarjeta ${cardId} no está en el capítulo cargado.`);
    }
    return updated;
  }

  /** Suspende o reactiva; la lista solo cambia si el almacén lo guardó. */
  async setSuspended(cardId: string, suspended: boolean): Promise<void> {
    const uid = requireSessionUid(this.session.user());
    await this.repository.setSuspended(uid, cardId, suspended);
    this.cards.update((cards) =>
      cards?.map((card) => (card.id === cardId ? { ...card, suspended } : card)),
    );
  }

  /** Borra una tarjeta; sale de la lista y del contador del libro solo tras el éxito. */
  async remove(bookId: string, cardId: string): Promise<void> {
    const uid = requireSessionUid(this.session.user());
    await this.repository.deleteWithCount(uid, bookId, cardId);
    this.cards.update((cards) => cards?.filter((card) => card.id !== cardId));
    this.books.changeCardCount(bookId, -1);
  }

  /** Borra varias de golpe; devuelve cuántas. Una lista vacía no escribe nada. */
  async removeMany(bookId: string, cardIds: readonly string[]): Promise<number> {
    if (cardIds.length === 0) {
      return 0;
    }
    const uid = requireSessionUid(this.session.user());
    try {
      const deleted = await this.repository.deleteManyWithCount(uid, bookId, cardIds);
      this.forgetDeleted(bookId, cardIds);
      return deleted;
    } catch (error) {
      // Cortado a mitad: lo ya borrado sale de la lista para que reintentar pida solo lo que falta.
      if (error instanceof PartialDeletionError) {
        this.forgetDeleted(bookId, error.deletedIds);
      }
      throw error;
    }
  }

  private forgetDeleted(bookId: string, cardIds: readonly string[]): void {
    if (cardIds.length === 0) {
      return;
    }
    const removed = new Set(cardIds);
    this.cards.update((cards) => cards?.filter((card) => !removed.has(card.id)));
    this.books.changeCardCount(bookId, -cardIds.length);
  }
}

function toNewCard(bookId: string, chapterId: string, draft: CardContentDraft, now: Date): NewCard {
  const isCloze = draft.cardType === 'cloze';
  const example = draft.example?.trim();
  return {
    bookId,
    chapterId,
    // Cada tarjeta es independiente en 1.0.0; el noteId queda listo para el bidireccional.
    noteId: crypto.randomUUID(),
    direction: 'forward',
    // Ausente = básica: el tipo solo se guarda en las cloze.
    ...(isCloze ? { cardType: 'cloze' as const } : {}),
    front: draft.front.trim(),
    back: isCloze ? '' : draft.back.trim(),
    ...(example ? { example } : {}),
    scheduling: initialCardScheduling(now),
    suspended: false,
  };
}

/** Contenido a guardar al editar; un ejemplo vacío se elimina (`null`). */
function toContentChanges(draft: CardContentDraft): CardContentChanges {
  return {
    front: draft.front.trim(),
    back: draft.cardType === 'cloze' ? '' : draft.back.trim(),
    example: draft.example?.trim() || null,
  };
}

function applyContentChanges(card: Card, changes: CardContentChanges): Card {
  const { example, ...rest } = changes;
  const updated: Card = { ...card, ...rest, updatedAt: new Date() };
  if (example === null) {
    delete updated.example;
  } else if (example !== undefined) {
    updated.example = example;
  }
  return updated;
}
