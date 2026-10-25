import { Injectable } from '@angular/core';

import { HandoffTray } from '@services/handoff/handoff-tray';

import type { QuizQuestion } from './generate-quiz';

/** De dónde sale una práctica: "Salir" y "Volver" llevan de regreso ahí. */
export type PracticeOrigin =
  | { readonly kind: 'chapter'; readonly bookId: string; readonly chapterId: string }
  | { readonly kind: 'book'; readonly bookId: string };

/** Una práctica lista para empezar: sus preguntas y su origen. */
export interface PreparedPractice {
  readonly questions: readonly QuizQuestion[];
  readonly origin: PracticeOrigin;
}

// La bandeja de la práctica: un capítulo o un libro entregan aquí su quiz y la pantalla de
// práctica lo toma una sola vez (ver `HandoffTray`). Aparte de la del repaso, para que ninguna
// guardia acepte lo preparado para la otra pantalla.
@Injectable({ providedIn: 'root' })
export class PracticeHandoffService extends HandoffTray<PreparedPractice> {}
