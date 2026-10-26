import { Injectable, computed, inject, resource, signal } from '@angular/core';

import type { CardContentDraft } from '@domain/models/card.model';
import {
  orderedItems,
  type PracticeItem,
  type PracticePackage,
} from '@domain/models/practice-package';
import type { Rating } from '@domain/models/rating';
import { Logger } from '@domain/ports/logger.port';
import { PracticePackageRepository } from '@domain/ports/practice-package.repository';
import { requireSessionUid, requireSessionUser } from '@services/session/require-session';
import { SessionService } from '@services/session/session.service';
import { studyDayId } from '@services/study-day/study-day';

import { DEFAULT_PROMPT_TEMPLATE, buildPrompt } from './build-prompt';
import { PracticeAiHandoffService } from './practice-ai-handoff.service';
import { hardTodayIds, hasPracticedToday, todayItemIds } from './pending-items';

export type PracticePackagesStatus = 'idle' | 'loading' | 'error' | 'ready';

const NO_SESSION = '';

// Los paquetes de práctica del usuario: una lista que comparten la Biblioteca, Hoy y el detalle.
// Las mutaciones cambian la lista local tras el éxito en el almacén (si fallan, se relanza sin
// tocar nada). Nada de esto toca libros, tarjetas, historial ni el día de estudio de los libros.
@Injectable({ providedIn: 'root' })
export class PracticePackagesService {
  private readonly repository = inject(PracticePackageRepository);
  private readonly session = inject(SessionService);
  private readonly handoff = inject(PracticeAiHandoffService);
  private readonly logger = inject(Logger);

  /** El recurso no lee nada hasta que una pantalla lo pide (`reload`); relee al cambiar de usuario. */
  private readonly loadRequested = signal(false);

  readonly packages = resource({
    params: () => (this.loadRequested() ? (this.session.user()?.id ?? NO_SESSION) : undefined),
    loader: async () => {
      try {
        return await this.repository.listByUser(requireSessionUid(this.session.user()));
      } catch (error) {
        this.logger.error('No se pudieron cargar los paquetes de práctica', error);
        throw error;
      }
    },
  });

  readonly status = computed<PracticePackagesStatus>(() => {
    const status = this.packages.status();
    if (status === 'idle') {
      return 'idle';
    }
    if (status === 'error') {
      return 'error';
    }
    return this.packages.hasValue() ? 'ready' : 'loading';
  });
  private readonly list = computed(() => (this.packages.hasValue() ? this.packages.value() : []));
  readonly open = computed(() => this.list().filter((pkg) => pkg.status === 'open'));
  /** El historial: el completado más reciente primero. */
  readonly completed = computed(() =>
    this.list()
      .filter((pkg) => pkg.status === 'completed')
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)),
  );

  /** Cada pantalla que muestra paquetes relee al abrirse. */
  reload(): void {
    if (this.loadRequested()) {
      this.packages.reload();
    } else {
      this.loadRequested.set(true);
    }
  }

  /** `undefined` mientras la lista no está lista, `null` si el paquete no existe. */
  findById(packageId: string): PracticePackage | null | undefined {
    if (!this.packages.hasValue()) {
      return undefined;
    }
    return this.packages.value().find((pkg) => pkg.id === packageId) ?? null;
  }

  /** El día de estudio de ahora, el mismo que usa Hoy. */
  currentDayId(): string {
    const { timezone, dayStartHour } = requireSessionUser(this.session.user()).settings;
    return studyDayId(new Date(), timezone, dayStartHour);
  }

  pendingCountFor(pkg: PracticePackage): number {
    return todayItemIds(pkg, this.currentDayId()).length;
  }

  practicedToday(pkg: PracticePackage): boolean {
    return hasPracticedToday(pkg, this.currentDayId());
  }

  /** Nace abierto y vacío con la capacidad del ajuste vigente. */
  async create(name: string): Promise<PracticePackage> {
    const user = requireSessionUser(this.session.user());
    const created = await this.repository.create(user.id, {
      name: name.trim(),
      capacity: user.settings.practicePackageCapacity,
    });
    this.packages.update((packages) => [...(packages ?? []), created]);
    return created;
  }

  async rename(packageId: string, name: string): Promise<void> {
    const trimmed = name.trim();
    await this.repository.rename(this.uid(), packageId, trimmed);
    this.change(packageId, (pkg) => ({ ...pkg, name: trimmed }));
  }

  async remove(packageId: string): Promise<void> {
    await this.repository.delete(this.uid(), packageId);
    this.packages.update((packages) => packages?.filter((pkg) => pkg.id !== packageId));
  }

  async addItems(packageId: string, drafts: readonly CardContentDraft[]): Promise<PracticeItem[]> {
    const added = await this.repository.addItems(this.uid(), packageId, drafts);
    this.change(packageId, (pkg) => ({
      ...pkg,
      items: { ...pkg.items, ...Object.fromEntries(added.map((item) => [item.id, item])) },
      itemOrder: [...pkg.itemOrder, ...added.map((item) => item.id)],
    }));
    return added;
  }

  async updateItem(packageId: string, itemId: string, draft: CardContentDraft): Promise<void> {
    await this.repository.updateItem(this.uid(), packageId, itemId, draft);
    this.changeItem(packageId, itemId, (item) => withContent(item, draft));
  }

  async removeItem(packageId: string, itemId: string): Promise<void> {
    await this.repository.removeItem(this.uid(), packageId, itemId);
    this.change(packageId, (pkg) => {
      const items = { ...pkg.items };
      delete items[itemId];
      return { ...pkg, items, itemOrder: pkg.itemOrder.filter((id) => id !== itemId) };
    });
  }

  async complete(packageId: string): Promise<void> {
    const completedAt = new Date();
    await this.repository.complete(this.uid(), packageId, completedAt);
    this.change(packageId, (pkg) => ({ ...pkg, status: 'completed', completedAt }));
  }

  /**
   * Prepara la práctica de hoy y la entrega; devuelve cuántos ítems tiene (0 = nada para hoy).
   * Preparar no es practicar: el conjunto del día lo fija la primera nota (ver abajo), así que
   * abrir la práctica y salir sin calificar no cuenta como "Ya practicaste hoy".
   */
  async prepareTodayPractice(packageId: string): Promise<number> {
    const pkg = this.findById(packageId);
    if (!pkg) {
      throw new Error(`El paquete ${packageId} no está cargado.`);
    }
    const dayId = this.currentDayId();
    const items = todayItemIds(pkg, dayId).flatMap((id) => (pkg.items[id] ? [pkg.items[id]] : []));
    if (items.length === 0) {
      return 0;
    }
    this.handoff.hand({ packageId, dayId, items });
    return items.length;
  }

  /**
   * La primera nota del día fija el conjunto de ese día (los ítems de la práctica, en el orden del
   * paquete) sin esperar al servidor: sin red queda en la cola del almacén y se usa igual. Desde
   * ahí, los ítems agregados ya no entran ese día. Las notas siguientes no hacen nada aquí.
   */
  fixTodaySetOnFirstGrade(packageId: string, dayId: string, itemIds: readonly string[]): void {
    const pkg = this.findById(packageId);
    if (!pkg || hasPracticedToday(pkg, dayId)) {
      return;
    }
    const todaySet = { dayId, itemIds: [...itemIds] };
    this.change(packageId, (current) => ({ ...current, todaySet }));
    this.repository.fixTodaySet(this.uid(), packageId, todaySet).catch((error: unknown) => {
      this.logger.error('No se pudo fijar el conjunto de hoy del paquete', error);
    });
  }

  /** Vacía la bandeja de la práctica: lo preparado ya no se va a abrir. */
  discardPrepared(): void {
    this.handoff.take();
  }

  /** La práctica guarda cada nota por su cuenta; aquí se refleja para el detalle y el prompt. */
  applyGrade(packageId: string, itemId: string, grade: Rating, dayId: string): void {
    this.changeItem(packageId, itemId, (item) => ({
      ...item,
      lastGrade: grade,
      lastPracticedDayId: dayId,
    }));
  }

  /**
   * El prompt de hoy: todos los ítems del conjunto del día y los difíciles de hoy. De un paquete
   * completado, todos sus ítems y ningún difícil. `null` si el paquete no está cargado.
   */
  promptFor(packageId: string): string | null {
    const pkg = this.findById(packageId);
    if (!pkg) {
      return null;
    }
    const template =
      requireSessionUser(this.session.user()).settings.promptTemplate ?? DEFAULT_PROMPT_TEMPLATE;
    if (pkg.status === 'completed') {
      return buildPrompt(template, orderedItems(pkg), []);
    }
    const dayId = this.currentDayId();
    const facesOf = (ids: string[]) => ids.flatMap((id) => (pkg.items[id] ? [pkg.items[id]] : []));
    return buildPrompt(
      template,
      facesOf(todayItemIds(pkg, dayId)),
      facesOf(hardTodayIds(pkg, dayId)),
    );
  }

  private uid(): string {
    return requireSessionUid(this.session.user());
  }

  private change(packageId: string, update: (pkg: PracticePackage) => PracticePackage): void {
    this.packages.update((packages) =>
      packages?.map((pkg) => (pkg.id === packageId ? update(pkg) : pkg)),
    );
  }

  private changeItem(
    packageId: string,
    itemId: string,
    update: (item: PracticeItem) => PracticeItem,
  ): void {
    this.change(packageId, (pkg) => {
      const item = pkg.items[itemId];
      return item ? { ...pkg, items: { ...pkg.items, [itemId]: update(item) } } : pkg;
    });
  }
}

/** El contenido nuevo de un ítem; conserva su última nota. */
function withContent(item: PracticeItem, draft: CardContentDraft): PracticeItem {
  const example = draft.example?.trim();
  const rest: PracticeItem = { ...item };
  delete rest.example;
  return {
    ...rest,
    cardType: draft.cardType,
    front: draft.front,
    back: draft.cardType === 'cloze' ? '' : draft.back,
    ...(example ? { example } : {}),
  };
}
