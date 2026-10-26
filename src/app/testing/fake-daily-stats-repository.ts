import type { DailyStats } from '@domain/models/daily-stats.model';
import { DailyStatsRepository } from '@domain/ports/daily-stats.repository';

type FailableMethod = 'getByDay' | 'listRecent';

// Fake en memoria de los indicadores diarios. `seed` siembra días; `failWith` hace fallar un
// método; `calls` registra con qué se llamó a cada uno.
export class FakeDailyStatsRepository extends DailyStatsRepository {
  readonly days = new Map<string, DailyStats>();
  readonly failWith: Partial<Record<FailableMethod, unknown>> = {};
  readonly calls: { getByDay: string[]; listRecent: number[] } = { getByDay: [], listRecent: [] };

  seed(...days: DailyStats[]): void {
    for (const day of days) {
      this.days.set(day.id, day);
    }
  }

  async getByDay(_uid: string, dayId: string): Promise<DailyStats | null> {
    this.calls.getByDay.push(dayId);
    this.failIfAsked('getByDay');
    return this.days.get(dayId) ?? null;
  }

  async listRecent(_uid: string, limit: number): Promise<DailyStats[]> {
    this.calls.listRecent.push(limit);
    this.failIfAsked('listRecent');
    return [...this.days.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  }

  private failIfAsked(method: FailableMethod): void {
    if (method in this.failWith) {
      throw this.failWith[method];
    }
  }
}

/** Un día de indicadores con valores razonables; se sobrescribe lo que haga falta. */
export function aDailyStats(overrides: Partial<DailyStats> = {}): DailyStats {
  const date = overrides.date ?? overrides.id ?? '2026-10-24';
  return {
    id: date,
    date,
    newCardsIntroduced: {},
    reviewsCompleted: 0,
    reviewsCompletedByBook: {},
    ratingCounts: { again: 0, hard: 0, good: 0, easy: 0 },
    ...overrides,
  };
}
