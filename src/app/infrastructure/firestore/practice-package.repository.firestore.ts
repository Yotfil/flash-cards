import {
  arrayRemove,
  collection,
  deleteDoc,
  deleteField,
  doc,
  runTransaction,
  setDoc,
  updateDoc,
  type DocumentReference,
  type Firestore,
  type FirestoreErrorCode,
} from 'firebase/firestore';

import type { CardContentDraft } from '@domain/models/card.model';
import type { PracticeItem, PracticePackage, TodaySet } from '@domain/models/practice-package';
import type { Rating } from '@domain/models/rating';
import { Logger } from '@domain/ports/logger.port';
import type { ReadSource } from '@domain/ports/read-source';
import {
  PackageFullError,
  PracticeItemGoneError,
  PracticePackageGoneError,
  PracticePackageRepository,
} from '@domain/ports/practice-package.repository';

import { parseDocument, parseDocuments } from './document-boundary';
import { readFrom } from './read-from';
import {
  packageItemOrderSchema,
  practicePackageDocumentSchema,
  type PracticePackageDocument,
} from './schemas/practice-package.schema';

// Paquetes de práctica en `users/{uid}/practicePackages`: un documento por paquete con sus ítems
// dentro (mapa por id + `itemOrder`). Calificar o fijar el día actualiza solo sus rutas; agregar
// lee y escribe en una transacción para no pasar nunca de la capacidad. Los restos sueltos de un
// ítem borrado (ver el esquema) no llegan al modelo: se registran como dato inesperado tolerado.
export class FirestorePracticePackageRepository extends PracticePackageRepository {
  constructor(
    private readonly firestore: Firestore,
    private readonly logger: Logger,
  ) {
    super();
  }

  // Se ordena en memoria (son pocos): `orderBy` dejaría fuera, sin avisar, un documento sin fecha,
  // y un documento malformado debe verse como fallo de carga.
  async listByUser(uid: string, source: ReadSource = 'server'): Promise<PracticePackage[]> {
    const snapshot = await readFrom(this.packagesOf(uid), source);
    const documents = parseDocuments(practicePackageDocumentSchema, snapshot.docs);
    // Lo guardado en el dispositivo se vuelve a leer del servidor enseguida: los restos sueltos
    // se registran una sola vez, con la lectura del servidor.
    if (source === 'server') {
      documents.forEach((document) => this.reportStrayItems(uid, document));
    }
    return documents.map(toPackage).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
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
      const { capacity, itemOrder } = parseDocument(
        packageItemOrderSchema,
        ref.path,
        snapshot.data(),
      );
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

  // En una transacción: escribir por rutas sobre un ítem que otro dispositivo ya borró crearía un
  // resto suelto. Editar ya exige red, así que leer antes no le quita nada.
  updateItem(
    uid: string,
    packageId: string,
    itemId: string,
    draft: CardContentDraft,
  ): Promise<void> {
    const ref = this.packageRef(uid, packageId);
    const example = draft.example?.trim();
    return runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) {
        throw new PracticePackageGoneError(packageId);
      }
      const { itemOrder } = parseDocument(packageItemOrderSchema, ref.path, snapshot.data());
      if (!itemOrder.includes(itemId)) {
        throw new PracticeItemGoneError(itemId);
      }
      transaction.update(ref, {
        [`items.${itemId}.cardType`]: draft.cardType,
        [`items.${itemId}.front`]: draft.front,
        [`items.${itemId}.back`]: draft.cardType === 'cloze' ? '' : draft.back,
        [`items.${itemId}.example`]: example ? example : deleteField(),
      });
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

  // Sin transacción: tiene que funcionar sin red y no esperar al servidor. `not-found` solo puede
  // significar que el paquete ya no existe; se traduce para que la práctica no la reintente.
  async recordGrade(
    uid: string,
    packageId: string,
    itemId: string,
    { grade, dayId }: { grade: Rating; dayId: string },
  ): Promise<void> {
    try {
      await updateDoc(this.packageRef(uid, packageId), {
        [`items.${itemId}.lastGrade`]: grade,
        [`items.${itemId}.lastPracticedDayId`]: dayId,
      });
    } catch (error) {
      if (hasFirestoreCode(error, 'not-found')) {
        throw new PracticePackageGoneError(packageId);
      }
      throw error;
    }
  }

  async complete(uid: string, packageId: string, completedAt: Date): Promise<void> {
    await updateDoc(this.packageRef(uid, packageId), { status: 'completed', completedAt });
  }

  private reportStrayItems(
    uid: string,
    document: PracticePackageDocument & { readonly id: string },
  ): void {
    if (document.strayItemIds.length > 0) {
      const path = this.packageRef(uid, document.id).path;
      this.logger.warn(
        `Se ignoraron ${document.strayItemIds.length} restos de ítems borrados en ${path}`,
      );
    }
  }

  private packagesOf(uid: string) {
    return collection(this.firestore, 'users', uid, 'practicePackages');
  }

  private packageRef(uid: string, packageId: string): DocumentReference {
    return doc(this.packagesOf(uid), packageId);
  }
}

/**
 * ¿Es un error de Firestore con ese código? Se mira `code` y no la clase: el SDK puede llegar en
 * más de una copia (la API de compatibilidad de las pruebas trae la suya) y `instanceof` fallaría.
 */
function hasFirestoreCode(error: unknown, code: FirestoreErrorCode): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
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

/**
 * El modelo de dominio a partir del documento validado, sin propiedades `undefined` y sin los
 * restos sueltos (campo por campo, para que nada del documento se cuele en el modelo).
 */
function toPackage(document: PracticePackageDocument & { readonly id: string }): PracticePackage {
  const { items, todaySet, completedAt } = document;
  return {
    id: document.id,
    name: document.name,
    capacity: document.capacity,
    status: document.status,
    items: Object.fromEntries(Object.entries(items).map(([id, item]) => [id, toItem(item)])),
    itemOrder: document.itemOrder,
    createdAt: document.createdAt,
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
