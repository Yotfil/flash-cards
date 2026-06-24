// Lógica de negocio de los capítulos de UN libro abierto: orquesta el puerto ChapterRepository y la
// sesión (AuthService) y expone el estado como signals para la UI. No conoce Firestore. El `uid` se
// resuelve aquí (desde la sesión), no en los componentes.

import { Injectable, inject, signal } from '@angular/core';

import { ChapterRepository } from '@domain/ports';
import type { Chapter } from '@domain/models';
import { AuthService } from './auth.service';

/** Estado de carga de los capítulos, para que la UI elija qué pintar (skeleton/error/lista). */
export type ChaptersStatus = 'idle' | 'loading' | 'ready' | 'error';

@Injectable({ providedIn: 'root' })
export class ChaptersService {
  private readonly chapterRepository = inject(ChapterRepository);
  private readonly authService = inject(AuthService);

  private readonly chaptersSignal = signal<Chapter[]>([]);
  private readonly statusSignal = signal<ChaptersStatus>('idle');
  private readonly errorMessageSignal = signal<string | null>(null);

  readonly chapters = this.chaptersSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly errorMessage = this.errorMessageSignal.asReadonly();

  /** Carga los capítulos del libro indicado. Maneja el error de forma visible (contrato). */
  async load(bookId: string): Promise<void> {
    this.statusSignal.set('loading');
    this.errorMessageSignal.set(null);
    try {
      const uid = this.requireUid();
      this.chaptersSignal.set(await this.chapterRepository.listByBook(uid, bookId));
      this.statusSignal.set('ready');
    } catch (error) {
      this.fail('No se pudieron cargar los capítulos.', error);
    }
  }

  /** Crea un capítulo al final del libro (orden = máximo actual + 1) y lo añade a la lista. */
  async create(bookId: string, name: string): Promise<void> {
    const uid = this.requireUid();
    const order = this.nextOrder();
    const created = await this.chapterRepository.create(uid, { bookId, name, order });
    this.chaptersSignal.update((chapters) => [...chapters, created]);
  }

  /** Renombra un capítulo y refleja el cambio en la lista local. */
  async rename(chapterId: string, name: string): Promise<void> {
    const uid = this.requireUid();
    await this.chapterRepository.update(uid, chapterId, { name });
    this.chaptersSignal.update((chapters) =>
      chapters.map((chapter) =>
        chapter.id === chapterId ? { ...chapter, name, updatedAt: new Date() } : chapter,
      ),
    );
  }

  /** Borra un capítulo y lo quita de la lista local. */
  async remove(chapterId: string): Promise<void> {
    const uid = this.requireUid();
    await this.chapterRepository.delete(uid, chapterId);
    this.chaptersSignal.update((chapters) =>
      chapters.filter((chapter) => chapter.id !== chapterId),
    );
  }

  private nextOrder(): number {
    const orders = this.chaptersSignal().map((chapter) => chapter.order);
    return orders.length === 0 ? 0 : Math.max(...orders) + 1;
  }

  /** El uid de la sesión actual; sin sesión es un error explícito (no debería pasar tras el guard). */
  private requireUid(): string {
    const uid = this.authService.currentUser()?.id;
    if (!uid) {
      throw new Error('No hay una sesión activa para operar sobre los capítulos.');
    }
    return uid;
  }

  private fail(message: string, error: unknown): void {
    console.error(message, error);
    this.errorMessageSignal.set(message);
    this.statusSignal.set('error');
  }
}
