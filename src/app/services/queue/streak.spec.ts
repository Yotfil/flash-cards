import { previousStudyDayId } from '@services/study-day/study-day';

import { computeStreak } from './streak';

const TODAY = '2026-10-24';

/** `count` días seguidos con repasos terminando en `lastDay` (incluido). */
function studiedDays(count: number, lastDay: string, reviewsCompleted = 3) {
  const days: { date: string; reviewsCompleted: number }[] = [];
  let day = lastDay;
  for (let index = 0; index < count; index++) {
    days.push({ date: day, reviewsCompleted });
    day = previousStudyDayId(day);
  }
  return days;
}

const yesterday = previousStudyDayId(TODAY);

describe('computeStreak', () => {
  it('racha en curso: seis días seguidos incluido hoy', () => {
    expect(computeStreak(studiedDays(6, TODAY), TODAY)).toBe(6);
  });

  it('no haber estudiado aún hoy no la rompe: cuenta desde ayer', () => {
    expect(computeStreak(studiedDays(5, yesterday), TODAY)).toBe(5);
  });

  it('un día sin estudiar la rompe', () => {
    expect(computeStreak(studiedDays(4, previousStudyDayId(yesterday)), TODAY)).toBe(0);
  });

  it('una sola tarjeta basta para que el día cuente', () => {
    expect(computeStreak(studiedDays(1, yesterday, 1), TODAY)).toBe(1);
  });

  it('un día con indicadores pero sin repasos no cuenta', () => {
    const days = [
      { date: TODAY, reviewsCompleted: 2 },
      { date: yesterday, reviewsCompleted: 0 },
      ...studiedDays(3, previousStudyDayId(yesterday)),
    ];

    expect(computeStreak(days, TODAY)).toBe(1);
  });

  it('primer día: solo hoy', () => {
    expect(computeStreak(studiedDays(1, TODAY), TODAY)).toBe(1);
  });

  it('mira como mucho 60 días', () => {
    expect(computeStreak(studiedDays(60, TODAY), TODAY)).toBe(60);
    expect(computeStreak(studiedDays(61, TODAY), TODAY)).toBe(60);
  });

  it('sin indicadores no hay racha', () => {
    expect(computeStreak([], TODAY)).toBe(0);
  });
});
