import type { CardContentDraft } from '@domain/models/card.model';
import type { PracticeItem, PracticePackage, TodaySet } from '@domain/models/practice-package';
import type { Rating } from '@domain/models/rating';
import type { ReadSource } from '@domain/ports/read-source';
import {
  PackageCompletedError,
  PackageFullError,
  PracticePackageRepository,
} from '@domain/ports/practice-package.repository';

type FailableMethod =
  | 'listByUser'
  | 'create'
  | 'rename'
  | 'delete'
  | 'addItems'
  | 'updateItem'
  | 'removeItem'
  | 'fixTodaySet'
  | 'complete';

interface PendingGrade {
  resolve: () => void;
  reject: (error: unknown) => void;
}

// Fake en memoria de los paquetes de práctica. `failWith` hace fallar un método; `calls` cuenta
// llamadas. Calificar aplica el cambio al instante y queda pendiente hasta `resolveNext` o
// `rejectNext`, como el guardado optimista real.
export class FakePracticePackageRepository extends PracticePackageRepository {
  readonly packages = new Map<string, PracticePackage>();
  readonly failWith: Partial<Record<FailableMethod, unknown>> = {};
  readonly calls: Record<FailableMethod | 'recordGrade', number> = {
    listByUser: 0,
    create: 0,
    rename: 0,
    delete: 0,
    addItems: 0,
    updateItem: 0,
    removeItem: 0,
    fixTodaySet: 0,
    recordGrade: 0,
    complete: 0,
  };
  readonly grades: { packageId: string; itemId: string; grade: Rating; dayId: string }[] = [];
  readonly todaySets: { packageId: string; todaySet: TodaySet }[] = [];
  readonly listedUids: string[] = [];
  private readonly pendingGrades: PendingGrade[] = [];
  private nextId = 1;

  seed(...packages: PracticePackage[]): void {
    for (const pkg of packages) {
      this.packages.set(pkg.id, pkg);
    }
  }

  get pendingGradeCount(): number {
    return this.pendingGrades.length;
  }

  /** Lo que el dispositivo tiene guardado: aparte de lo del servidor (`seed`). */
  readonly onDevice = new Map<string, PracticePackage>();
  /** Lecturas del dispositivo (las del servidor las cuenta `calls`). */
  readonly deviceCalls = { listByUser: 0 };

  seedOnDevice(...packages: PracticePackage[]): void {
    for (const pkg of packages) {
      this.onDevice.set(pkg.id, pkg);
    }
  }

  async listByUser(uid: string, source: ReadSource = 'server'): Promise<PracticePackage[]> {
    if (source === 'device') {
      this.deviceCalls.listByUser++;
      return byCreation(this.onDevice);
    }
    this.record('listByUser');
    this.listedUids.push(uid);
    return byCreation(this.packages);
  }

  async create(_uid: string, input: { name: string; capacity: number }): Promise<PracticePackage> {
    this.record('create');
    const pkg: PracticePackage = {
      id: `p${this.nextId++}`,
      name: input.name,
      capacity: input.capacity,
      status: 'open',
      items: {},
      itemOrder: [],
      createdAt: new Date(),
    };
    this.packages.set(pkg.id, pkg);
    return pkg;
  }

  async rename(_uid: string, packageId: string, name: string): Promise<void> {
    this.record('rename');
    this.change(packageId, (pkg) => ({ ...pkg, name }));
  }

  async delete(_uid: string, packageId: string): Promise<void> {
    this.record('delete');
    this.packages.delete(packageId);
  }

  async addItems(
    _uid: string,
    packageId: string,
    drafts: readonly CardContentDraft[],
  ): Promise<PracticeItem[]> {
    this.record('addItems');
    const pkg = this.require(packageId);
    if (pkg.status !== 'open') {
      throw new PackageCompletedError(packageId);
    }
    if (pkg.itemOrder.length + drafts.length > pkg.capacity) {
      throw new PackageFullError(pkg.capacity);
    }
    const added = drafts.map((draft) => anItem({ ...draft, id: `i${this.nextId++}` }));
    this.change(packageId, (current) => ({
      ...current,
      items: { ...current.items, ...Object.fromEntries(added.map((item) => [item.id, item])) },
      itemOrder: [...current.itemOrder, ...added.map((item) => item.id)],
    }));
    return added;
  }

  async updateItem(
    _uid: string,
    packageId: string,
    itemId: string,
    draft: CardContentDraft,
  ): Promise<void> {
    this.record('updateItem');
    this.changeItem(packageId, itemId, (item) => withContent(item, draft));
  }

  async removeItem(_uid: string, packageId: string, itemId: string): Promise<void> {
    this.record('removeItem');
    this.change(packageId, (pkg) => {
      const items = { ...pkg.items };
      delete items[itemId];
      return { ...pkg, items, itemOrder: pkg.itemOrder.filter((id) => id !== itemId) };
    });
  }

  async fixTodaySet(_uid: string, packageId: string, todaySet: TodaySet): Promise<void> {
    this.record('fixTodaySet');
    this.todaySets.push({ packageId, todaySet });
    this.change(packageId, (pkg) => ({ ...pkg, todaySet }));
  }

  recordGrade(
    _uid: string,
    packageId: string,
    itemId: string,
    { grade, dayId }: { grade: Rating; dayId: string },
  ): Promise<void> {
    this.calls.recordGrade++;
    this.grades.push({ packageId, itemId, grade, dayId });
    this.changeItem(packageId, itemId, (item) => ({
      ...item,
      lastGrade: grade,
      lastPracticedDayId: dayId,
    }));
    return new Promise<void>((resolve, reject) => this.pendingGrades.push({ resolve, reject }));
  }

  resolveNext(): void {
    this.takeNext().resolve();
  }

  rejectNext(error: unknown = new Error('rechazado')): void {
    this.takeNext().reject(error);
  }

  async complete(_uid: string, packageId: string, completedAt: Date): Promise<void> {
    this.record('complete');
    this.change(packageId, (pkg) => ({ ...pkg, status: 'completed', completedAt }));
  }

  private takeNext(): PendingGrade {
    const next = this.pendingGrades.shift();
    if (!next) {
      throw new Error('No hay calificaciones pendientes');
    }
    return next;
  }

  private require(packageId: string): PracticePackage {
    const pkg = this.packages.get(packageId);
    if (!pkg) {
      throw new Error(`No existe el paquete ${packageId}`);
    }
    return pkg;
  }

  private change(packageId: string, update: (pkg: PracticePackage) => PracticePackage): void {
    this.packages.set(packageId, update(this.require(packageId)));
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

  private record(method: FailableMethod): void {
    this.calls[method]++;
    if (method in this.failWith) {
      throw this.failWith[method];
    }
  }
}

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

/** Ítem de prueba con valores razonables; se sobrescribe lo que haga falta. */
export function anItem(overrides: Partial<PracticeItem> = {}): PracticeItem {
  return {
    id: 'i1',
    cardType: 'basic',
    front: 'to call it a day',
    back: 'dar el día por terminado',
    addedAt: new Date('2026-10-20T15:00:00.000Z'),
    ...overrides,
  };
}

function byCreation(packages: ReadonlyMap<string, PracticePackage>): PracticePackage[] {
  return [...packages.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/** Paquete de prueba (abierto, capacidad 20) con los ítems dados, en ese orden. */
export function aPackage(
  overrides: Partial<PracticePackage> = {},
  items: PracticeItem[] = [],
): PracticePackage {
  return {
    id: 'p1',
    name: 'Película del viernes',
    capacity: 20,
    status: 'open',
    items: Object.fromEntries(items.map((item) => [item.id, item])),
    itemOrder: items.map((item) => item.id),
    createdAt: new Date('2026-10-20T15:00:00.000Z'),
    ...overrides,
  };
}
