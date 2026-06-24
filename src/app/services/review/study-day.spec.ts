import { endOfStudyDay, studyDayId } from './study-day';

describe('studyDayId', () => {
  it('antes de la hora de inicio (4am) cuenta como el día anterior', () => {
    expect(studyDayId(new Date('2026-06-23T02:00:00Z'), 'UTC', 4)).toBe('2026-06-22');
  });

  it('después de la hora de inicio es el mismo día', () => {
    expect(studyDayId(new Date('2026-06-23T05:00:00Z'), 'UTC', 4)).toBe('2026-06-23');
  });

  it('respeta la zona horaria del usuario', () => {
    // 2026-06-23T01:00Z = 2026-06-22T20:00 en Nueva York; con dayStart 4 sigue siendo el 22.
    expect(studyDayId(new Date('2026-06-23T01:00:00Z'), 'America/New_York', 4)).toBe('2026-06-22');
  });
});

describe('endOfStudyDay', () => {
  it('después de la hora de inicio, termina en el siguiente límite (mañana a las 4am)', () => {
    const end = endOfStudyDay(new Date('2026-06-23T10:00:00Z'), 'UTC', 4);
    expect(end.toISOString()).toBe('2026-06-24T04:00:00.000Z');
  });

  it('antes de la hora de inicio, termina hoy a las 4am', () => {
    const end = endOfStudyDay(new Date('2026-06-23T02:00:00Z'), 'UTC', 4);
    expect(end.toISOString()).toBe('2026-06-23T04:00:00.000Z');
  });
});
