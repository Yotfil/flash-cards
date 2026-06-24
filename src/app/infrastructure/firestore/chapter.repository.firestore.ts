// Adaptador Firestore del puerto ChapterRepository. ÚNICA pieza (junto a otros repos) que habla con
// Firestore para los capítulos. Valida con Zod al leer (frontera) y traduce documento ↔ modelo del
// dominio. Los capítulos viven en la colección plana `users/{uid}/chapters` con un campo `bookId`.

import { Injectable, inject } from '@angular/core';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { ChapterRepository, type ChapterCreateInput } from '@domain/ports';
import type { Chapter, ChapterDraft } from '@domain/models';
import { FIRESTORE } from '@infrastructure/firebase';
import { chapterDocumentSchema, type ChapterDocument } from './schemas/chapter.schema';

const USERS_COLLECTION = 'users';
const CHAPTERS_COLLECTION = 'chapters';

@Injectable()
export class FirestoreChapterRepository extends ChapterRepository {
  private readonly firestore = inject(FIRESTORE);

  override async listByBook(uid: string, bookId: string): Promise<Chapter[]> {
    // Sólo filtro por igualdad (auto-indexado): el orden se aplica en memoria para no exigir un
    // índice compuesto bookId+order; los capítulos por libro son pocos.
    const chaptersQuery = query(this.chaptersCollection(uid), where('bookId', '==', bookId));
    const snapshot = await getDocs(chaptersQuery);

    return snapshot.docs
      .map((document) => {
        // Frontera: cada documento es externo, se valida antes de tocarlo. `parse` lanza si no cumple.
        const data = chapterDocumentSchema.parse(document.data());
        return this.toChapter(document.id, data);
      })
      .sort((a, b) => a.order - b.order);
  }

  override async create(uid: string, input: ChapterCreateInput): Promise<Chapter> {
    const reference = doc(this.chaptersCollection(uid));
    const now = new Date();

    const document = {
      bookId: input.bookId,
      name: input.name,
      order: input.order,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };
    await setDoc(reference, document);

    return {
      id: reference.id,
      bookId: input.bookId,
      name: input.name,
      order: input.order,
      createdAt: now,
      updatedAt: now,
    };
  }

  override async update(
    uid: string,
    chapterId: string,
    changes: Partial<ChapterDraft>,
  ): Promise<void> {
    // Sólo se escriben los campos presentes; `updatedAt` se refresca siempre.
    const data: Record<string, unknown> = { updatedAt: Timestamp.fromDate(new Date()) };
    if (changes.name !== undefined) {
      data['name'] = changes.name;
    }
    await updateDoc(doc(this.chaptersCollection(uid), chapterId), data);
  }

  override async delete(uid: string, chapterId: string): Promise<void> {
    await deleteDoc(doc(this.chaptersCollection(uid), chapterId));
  }

  private chaptersCollection(uid: string) {
    return collection(this.firestore, USERS_COLLECTION, uid, CHAPTERS_COLLECTION);
  }

  private toChapter(id: string, data: ChapterDocument): Chapter {
    return {
      id,
      bookId: data.bookId,
      name: data.name,
      order: data.order,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
