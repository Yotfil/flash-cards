import { Injectable, computed, inject, resource, signal } from '@angular/core';

import type { Book } from '@domain/models/book.model';
import type { Card } from '@domain/models/card.model';
import type { DailyStats } from '@domain/models/daily-stats.model';
import { CardRepository } from '@domain/ports/card.repository';
import { DailyStatsRepository } from '@domain/ports/daily-stats.repository';
import { Logger } from '@domain/ports/logger.port';
import { BooksService } from '@services/books/books.service';
import { readDeviceThenServer } from '@services/data-loading/read-device-then-server';
import { requireSessionUid, requireSessionUser } from '@services/session/require-session';
import { SessionService } from '@services/session/session.service';
import { studyDayAt, type StudyDay } from '@services/study-day/study-day';

import { buildDailyQueue, type DailyQueue } from './build-daily-queue';
import { MAX_STREAK_DAYS, computeStreak } from './streak';

export type DailyQueueStatus = 'loading' | 'error' | 'ready';

/** Una fila del control "Ajustar nuevas de hoy": lo elegido para la sesión y el máximo elegible. */
export interface NewCardsChoice {
  readonly bookId: string;
  readonly name: string;
  readonly chosen: number;
  readonly available: number;
}

/** Ajuste de nuevas de la sesión: pertenece a un día de estudio y caduca con él. */
interface SessionNew {
  readonly dayId: string;
  readonly limits: Readonly<Record<string, number>>;
}

/** Una lectura completa para armar la cola: libros, candidatas e indicadores de hoy. */
interface QueueData {
  readonly books: readonly Book[];
  readonly candidates: readonly Card[];
  readonly today: DailyStats | null;
}

const EMPTY_QUEUE: DailyQueue = {
  cards: [],
  dueCount: 0,
  newCount: 0,
  perBook: [],
  availableNewByBook: {},
};

// La cola de Hoy. Una sola lectura por entrada a Hoy (`refresh`): libros, tarjetas listas hasta el
// fin del día de estudio e indicadores de hoy. Con eso, la cola base y la de la sesión se derivan
// en memoria, así un ajuste no vuelve a consultar.
@Injectable({ providedIn: 'root' })
export class DailyQueueService {
  private readonly session = inject(SessionService);
  private readonly books = inject(BooksService);
  private readonly cards = inject(CardRepository);
  private readonly dailyStats = inject(DailyStatsRepository);
  private readonly logger = inject(Logger);

  private readonly studyDay = signal<StudyDay | null>(null);
  /** La racha solo la muestra Hoy: no se lee hasta que Hoy la pide (Progreso arma la cola sin ella). */
  private readonly streakRequested = signal(false);
  // Vive en memoria (no se persiste): sobrevive a la navegación y a `refresh`, no a una recarga.
  private readonly sessionNew = signal<SessionNew | null>(null);

  /** La última lectura del servidor (en curso o terminada): la sesión sale de ella, no de lo pintado. */
  private lastServerRead: { dayId: string; promise: Promise<QueueData>; failed: boolean } | null =
    null;

  /**
   * Pinta primero la cola con lo guardado en el dispositivo y la cambia por la del servidor al
   * llegar. Sin libros o sin tarjetas guardadas no pinta nada hasta el servidor: una caché a medias
   * no debe dar "Estás al día".
   */
  private readonly data = resource({
    params: () => {
      const day = this.studyDay();
      return day ? { uid: this.session.user()?.id ?? '', day } : undefined;
    },
    stream: ({ params, abortSignal }) =>
      readDeviceThenServer({
        fromDevice: () => this.readSaved(params.day),
        fromServer: () => this.read(params.day),
        hasContent: (data) => data.books.length > 0 && data.candidates.length > 0,
        logger: this.logger,
        // Hoy pinta "No pudimos cargar tu cola de hoy"; aquí queda el detalle.
        errorMessage: 'No se pudo armar la cola de Hoy',
        abortSignal,
      }),
  });

  /**
   * Racha de días de estudio, aparte de la cola: si su lectura falla se omite (`null`) y se
   * registra, sin tumbar la cola ni retrasarla.
   */
  readonly streak = resource({
    params: () => {
      const day = this.studyDay();
      return day && this.streakRequested()
        ? { uid: this.session.user()?.id ?? '', dayId: day.id }
        : undefined;
    },
    loader: async ({ params }): Promise<number | null> => {
      try {
        const uid = requireSessionUid(this.session.user());
        return computeStreak(await this.dailyStats.listRecent(uid, MAX_STREAK_DAYS), params.dayId);
      } catch (error) {
        this.logger.warn('No se pudo calcular la racha de Hoy', error);
        return null;
      }
    },
  });

  private readonly snapshot = computed(() => (this.data.hasValue() ? this.data.value() : null));

  readonly status = computed<DailyQueueStatus>(() => {
    const status = this.data.status();
    if (status === 'error') {
      return 'error';
    }
    return status === 'resolved' || status === 'local' ? 'ready' : 'loading';
  });
  readonly hasBooks = computed(() => (this.snapshot()?.books.length ?? 0) > 0);
  /** Los indicadores del día de estudio en curso (`null` si hoy no hubo actividad). */
  readonly todayStats = computed(() => this.snapshot()?.today ?? null);
  /** La cola con los topes de cada libro, sin el ajuste de la sesión (la que ve Progreso). */
  readonly baseQueue = computed(() => this.buildQueue());
  /** La cola de Hoy: la base con el ajuste de nuevas de la sesión. */
  readonly sessionQueue = computed(() => this.buildQueue(this.currentLimits()));
  /** Un control por libro, en el orden de la biblioteca (los sin nuevas dicen "sin nuevas"). */
  readonly newCardsChoices = computed<NewCardsChoice[]>(() => {
    const queue = this.sessionQueue();
    return [...(this.snapshot()?.books ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((book) => ({
        bookId: book.id,
        name: book.name,
        chosen: queue.perBook.find((row) => row.bookId === book.id)?.new ?? 0,
        available: queue.availableNewByBook[book.id] ?? 0,
      }));
  });

  /**
   * Hoy: vuelve a armar la cola y a leer la racha, en cada entrada a Hoy y antes de preparar una
   * sesión. Si el día de estudio cambió, la lectura sigue al día nuevo; si no, se repite.
   */
  refresh(): void {
    if (!this.session.user()) {
      return;
    }
    const sameDay = this.studyDay()?.id === this.currentDay().id;
    this.refreshQueue();
    if (!this.streakRequested()) {
      this.streakRequested.set(true);
    } else if (sameDay) {
      // Con el día nuevo la racha ya se relee sola: cambió su parámetro.
      this.streak.reload();
    }
  }

  /** Progreso: vuelve a armar solo la cola; no lee la racha, que Progreso no muestra. */
  refreshQueue(): void {
    if (!this.session.user()) {
      return;
    }
    const day = this.currentDay();
    if (this.studyDay()?.id === day.id) {
      this.data.reload();
      return;
    }
    this.studyDay.set(day);
  }

  /**
   * Las tarjetas de la sesión de Hoy, en orden. Salen de la lectura del servidor (la ya hecha o la
   * que está en curso), no de la cola pintada, que puede ser la guardada en el dispositivo; si esa
   * lectura falló, se lee otra vez. Si el día de estudio cambió con Hoy abierta, se lee la del día
   * nuevo (el ajuste de ayer ya caducó) y la pantalla se vuelve a armar.
   */
  async prepareSession(): Promise<Card[]> {
    const day = this.currentDay();
    if (day.id !== this.studyDay()?.id) {
      this.refresh();
      return queueFrom(await this.read(day), day).cards;
    }
    const last = this.lastServerRead;
    const data =
      last && last.dayId === day.id && !last.failed ? await last.promise : await this.read(day);
    return queueFrom(data, day, this.currentLimits()).cards;
  }

  /** Cambia las nuevas de un libro solo para la sesión de hoy; los demás libros no cambian. */
  setSessionNew(bookId: string, count: number): void {
    const day = this.studyDay();
    if (!day) {
      return;
    }
    this.sessionNew.set({ dayId: day.id, limits: { ...this.currentLimits(), [bookId]: count } });
  }

  /** Las nuevas de un libro en la cola de la sesión (las de la base si no se ajustó). */
  sessionNewFor(bookId: string): number {
    return this.sessionQueue().perBook.find((row) => row.bookId === bookId)?.new ?? 0;
  }

  /** El ajuste vigente: el de otro día de estudio ya no cuenta. */
  private currentLimits(): Readonly<Record<string, number>> {
    const adjustment = this.sessionNew();
    return adjustment && adjustment.dayId === this.studyDay()?.id ? adjustment.limits : {};
  }

  private buildQueue(sessionNewByBook?: Readonly<Record<string, number>>): DailyQueue {
    const data = this.snapshot();
    const day = this.studyDay();
    return data && day ? queueFrom(data, day, sessionNewByBook) : EMPTY_QUEUE;
  }

  /** Lo que el dispositivo ya tiene guardado para armar la cola, sin ir al servidor. */
  private async readSaved(day: StudyDay): Promise<QueueData> {
    const uid = requireSessionUid(this.session.user());
    const [books, candidates, today] = await Promise.all([
      this.books.loadSaved(),
      this.cards.listReady(uid, day.endOfDay, 'device'),
      this.dailyStats.getByDay(uid, day.id, 'device'),
    ]);
    return { books, candidates, today };
  }

  /** La lectura del servidor, guardada para que preparar la sesión la espere sin repetirla. */
  private read(day: StudyDay): Promise<QueueData> {
    const read = { dayId: day.id, promise: this.readFromServer(day), failed: false };
    // El fallo lo registra el recurso; aquí solo se marca para no reutilizar una lectura fallida.
    read.promise.catch(() => {
      read.failed = true;
    });
    this.lastServerRead = read;
    return read.promise;
  }

  /**
   * Una lectura completa: libros, listas hasta el fin del día e indicadores de ese día. Los libros
   * se releen siempre: un libro creado (o una tanda cambiada) en otro dispositivo debe entrar.
   */
  private async readFromServer(day: StudyDay): Promise<QueueData> {
    const uid = requireSessionUid(this.session.user());
    const [books, candidates, today] = await Promise.all([
      this.books.loadFresh(),
      this.cards.listReady(uid, day.endOfDay),
      this.dailyStats.getByDay(uid, day.id),
    ]);
    this.reportOrphans(books, candidates);
    return { books, candidates, today };
  }

  /**
   * Las tarjetas de un libro borrado que quedaron sin borrar no entran en la cola (ver
   * `buildDailyQueue`); aquí, al leer, se deja constancia de cuántas hay.
   */
  private reportOrphans(books: readonly Book[], candidates: readonly Card[]): void {
    const bookIds = new Set(books.map((book) => book.id));
    const orphans = candidates.filter((card) => !bookIds.has(card.bookId)).length;
    if (orphans > 0) {
      this.logger.warn(`Tarjetas de libros que ya no existen, fuera de Hoy: ${orphans}`);
    }
  }

  private currentDay(): StudyDay {
    const { timezone, dayStartHour } = requireSessionUser(this.session.user()).settings;
    return studyDayAt(new Date(), timezone, dayStartHour);
  }
}

function queueFrom(
  data: QueueData,
  day: StudyDay,
  sessionNewByBook?: Readonly<Record<string, number>>,
): DailyQueue {
  return buildDailyQueue({
    candidates: data.candidates,
    books: data.books,
    endOfDay: day.endOfDay,
    introducedByBook: data.today?.newCardsIntroduced ?? {},
    reviewedByBook: data.today?.reviewsCompletedByBook ?? {},
    ...(sessionNewByBook ? { sessionNewByBook } : {}),
  });
}
