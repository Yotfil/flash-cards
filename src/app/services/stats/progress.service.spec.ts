import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { CardRepository, DailyStatsRepository, type CardStateCounts } from '@domain/ports';
import type { DailyStats, User } from '@domain/models';
import { AuthService } from '@services/auth.service';
import { QueueService } from '@services/review';
import { ProgressService } from './progress.service';

const USER: User = {
  id: 'u1',
  displayName: 'Test',
  email: 't@e.com',
  createdAt: new Date(),
  settings: { timezone: 'UTC', dayStartHour: 4, theme: 'system' },
  isSearchable: false,
};

describe('ProgressService', () => {
  function configure(collection: CardStateCounts, today: DailyStats | null): ProgressService {
    const cardRepo: Partial<CardRepository> = { countByState: async () => collection };
    const statsRepo: Partial<DailyStatsRepository> = { getToday: async () => today };
    const queueService: Partial<QueueService> = {
      load: async () => {
        // No-op en la prueba; los conteos se fijan abajo.
      },
      dueCount: signal(4).asReadonly(),
      newCount: signal(2).asReadonly(),
    };
    TestBed.configureTestingModule({
      providers: [
        ProgressService,
        { provide: CardRepository, useValue: cardRepo },
        { provide: DailyStatsRepository, useValue: statsRepo },
        { provide: QueueService, useValue: queueService },
        { provide: AuthService, useValue: { currentUser: signal<User | null>(USER) } },
      ],
    });
    return TestBed.inject(ProgressService);
  }

  it('agrega pendientes, repasadas, distribución y colección; queda en ready', async () => {
    const today: DailyStats = {
      id: '2026-06-23',
      date: '2026-06-23',
      reviewsCompleted: 7,
      ratingCounts: { again: 1, hard: 1, good: 4, easy: 1 },
      newCardsIntroduced: {},
    };
    const service = configure({ newCards: 3, learning: 2, review: 5 }, today);

    await service.load();

    expect(service.status()).toBe('ready');
    expect(service.pendingDue()).toBe(4);
    expect(service.pendingNew()).toBe(2);
    expect(service.reviewsToday()).toBe(7);
    expect(service.ratingCounts().good).toBe(4);
    expect(service.totalCards()).toBe(10);
    expect(service.isEmpty()).toBe(false);
  });

  it('sin stats del día usa ceros (reviewsToday 0)', async () => {
    const service = configure({ newCards: 1, learning: 0, review: 0 }, null);

    await service.load();

    expect(service.reviewsToday()).toBe(0);
    expect(service.ratingCounts()).toEqual({ again: 0, hard: 0, good: 0, easy: 0 });
  });

  it('isEmpty cuando no hay tarjetas', async () => {
    const service = configure({ newCards: 0, learning: 0, review: 0 }, null);

    await service.load();

    expect(service.isEmpty()).toBe(true);
  });
});
