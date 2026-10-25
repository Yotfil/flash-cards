import {
  arrayRemove,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

import type { CardContentDraft } from '@domain/models/card.model';
import type { PracticeItem, PracticePackage, TodaySet } from '@domain/models/practice-package';
import type { Rating } from '@domain/models/rating';
import {
  PackageFullError,
  PracticePackageRepository,
} from '@domain/ports/practice-package.repository';

import { parseDocument, parseDocuments } from './document-boundary';
import {
  practicePackageDocumentSchema,
  type PracticePackageDocument,
} from './schemas/practice-package.schema';

/** Lo que hace falta leer para decidir si caben más ítems. */
const capacitySchema = practicePackageDocumentSchema.pick({ capacity: true, itemOrder: true });

// Paquetes de práctica en `users/{uid}/practicePackages`: un documento por paquete con sus ítems
// dentro (mapa por id + `itemOrder`). Calificar o fijar el día actualiza solo sus rutas; agregar
// lee y escribe en una transacción para no pasar nunca de la capacidad.
export class FirestorePracticePackageRepository extends PracticePackageRepository {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  // Se ordena en memoria (son pocos): `orderBy` dejaría fuera, sin avisar, un documento sin fecha,
  // y un documento malformado debe verse como fallo de carga.
  async listByUser(uid: string): Promise<PracticePackage[]> {
    const snapshot = await getDocs(this.packagesOf(uid));
    return parseDocuments(practicePackageDocumentSchema, snapshot.docs)
      .map(toPackage)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async create(uid: string, input: { name: string; capacity: number }): Promise<PracticePackage> {
    const ref = doc(this.packagesOf(uid));
    const created = {
      name: input.name,
      capacity: input.capacity,
      status: 'open' as const,
      items: {},
      itemOrder: [],
      createdAt: new Date(),
    };
    await setDoc(ref, created);
    return { id: ref.id, ...created };
  }

  async rename(uid: string, packageId: string, name: string): Promise<void> {
    await updateDoc(this.packageRef(uid, packageId), { name });
  }

  async delete(uid: string, packageId: string): Promise<void> {
    await deleteDoc(this.packageRef(uid, packageId));
  }

  addItems(
    uid: string,
    packageId: string,
    drafts: readonly CardContentDraft[],
  ): Promise<PracticeItem[]> {
    const ref = this.packageRef(uid, packageId);
    return runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const { capacity, itemOrder } = parseDocument(capacitySchema, ref.path, snapshot.data());
      if (itemOrder.length + drafts.length > capacity) {
        throw new PackageFullError(capacity);
      }
      const addedAt = new Date();
      const items = drafts.map((draft) => newItem(doc(this.packagesOf(uid)).id, draft, addedAt));
      transaction.update(ref, {
        ...Object.fromEntries(items.map(({ id, ...stored }) => [`items.${id}`, stored])),
        itemOrder: [...itemOrder, ...items.map((item) => item.id)],
      });
      return items;
    });
  }

  async updateItem(
    uid: string,
    packageId: string,
    itemId: string,
    draft: CardContentDraft,
  ): Promise<void> {
    const example = draft.example?.trim();
    await updateDoc(this.packageRef(uid, packageId), {
      [`items.${itemId}.cardType`]: draft.cardType,
      [`items.${itemId}.front`]: draft.front,
      [`items.${itemId}.back`]: draft.cardType === 'cloze' ? '' : draft.back,
      [`items.${itemId}.example`]: example ? example : deleteField(),
    });
  }

  async removeItem(uid: string, packageId: string, itemId: string): Promise<void> {
    await updateDoc(this.packageRef(uid, packageId), {
      [`items.${itemId}`]: deleteField(),
      itemOrder: arrayRemove(itemId),
    });
  }

  async fixTodaySet(uid: string, packageId: string, todaySet: TodaySet): Promise<void> {
    await updateDoc(this.packageRef(uid, packageId), { todaySet });
  }

  async recordGrade(
    uid: string,
    packageId: string,
    itemId: string,
    { grade, dayId }: { grade: Rating; dayId: string },
  ): Promise<void> {
    await updateDoc(this.packageRef(uid, packageId), {
      [`items.${itemId}.lastGrade`]: grade,
      [`items.${itemId}.lastPracticedDayId`]: dayId,
    });
  }

  async complete(uid: string, packageId: string, completedAt: Date): Promise<void> {
    await updateDoc(this.packageRef(uid, packageId), { status: 'completed', completedAt });
  }

  private packagesOf(uid: string) {
    return collection(this.firestore, 'users', uid, 'practicePackages');
  }

  private packageRef(uid: string, packageId: string): DocumentReference {
    return doc(this.packagesOf(uid), packageId);
  }
}

/** Un ítem nuevo: sin calificación; la cloze sin reverso y el ejemplo recortado (vacío = sin él). */
function newItem(id: string, draft: CardContentDraft, addedAt: Date): PracticeItem {
  const example = draft.example?.trim();
  return {
    id,
    cardType: draft.cardType,
    front: draft.front,
    back: draft.cardType === 'cloze' ? '' : draft.back,
    ...(example ? { example } : {}),
    addedAt,
  };
}

/** El modelo de dominio a partir del documento validado, sin propiedades `undefined`. */
function toPackage(document: PracticePackageDocument & { readonly id: string }): PracticePackage {
  const { items, todaySet, completedAt, ...rest } = document;
  return {
    ...rest,
    items: Object.fromEntries(Object.entries(items).map(([id, item]) => [id, toItem(item)])),
    ...(todaySet ? { todaySet } : {}),
    ...(completedAt ? { completedAt } : {}),
  };
}

function toItem(item: PracticePackageDocument['items'][string]): PracticeItem {
  const { example, lastGrade, lastPracticedDayId, ...rest } = item;
  return {
    ...rest,
    ...(example !== undefined ? { example } : {}),
    ...(lastGrade !== undefined ? { lastGrade } : {}),
    ...(lastPracticedDayId !== undefined ? { lastPracticedDayId } : {}),
  };
}
