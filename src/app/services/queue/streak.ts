import { previousStudyDayId } from '@services/study-day/study-day';

/** Lo único que la racha necesita de cada día de indicadores. */
export interface StudiedDay {
  readonly date: string;
  readonly reviewsCompleted: number;
}

/** Cuántos días se miran como mucho: con todos estudiados, la pantalla dice "60+". */
export const MAX_STREAK_DAYS = 60;

/**
 * Racha de días de estudio seguidos (pura), calculada al vuelo desde los indicadores diarios. Un
 * día cuenta si tuvo al menos un repaso de cualquier libro. Se cuenta hacia atrás desde hoy si hoy
 * ya se estudió, o desde ayer si todavía no: no haber estudiado aún hoy no la rompe.
 */
export function computeStreak(
  days: readonly StudiedDay[],
  todayId: string,
  maxDays = MAX_STREAK_DAYS,
): number {
  const studied = new Set(days.filter((day) => day.reviewsCompleted >= 1).map((day) => day.date));
  let day = studied.has(todayId) ? todayId : previousStudyDayId(todayId);
  let streak = 0;
  while (streak < maxDays && studied.has(day)) {
    streak++;
    day = previousStudyDayId(day);
  }
  return streak;
}
