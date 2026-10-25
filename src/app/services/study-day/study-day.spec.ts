import {
  endOfStudyDay,
  formatLocalDate,
  previousStudyDayId,
  studyDayAt,
  studyDayId,
} from './study-day';

const BOGOTA = 'America/Bogota'; // UTC−5 todo el año
const DAY_START = 4;

describe('studyDayId', () => {
  it('un repaso de madrugada cuenta como el día anterior', () => {
    // 01:30 en Bogotá del 15 de junio.
    expect(studyDayId(new Date('2026-06-15T06:30:00Z'), BOGOTA, DAY_START)).toBe('2026-06-14');
  });

  it('después de la hora de inicio es el mismo día', () => {
    // 09:00 en Bogotá del 15 de junio.
    expect(studyDayId(new Date('2026-06-15T14:00:00Z'), BOGOTA, DAY_START)).toBe('2026-06-15');
  });

  it('respeta la zona horaria del usuario', () => {
    const instant = new Date('2026-06-15T20:00:00Z');

    expect(studyDayId(instant, 'Asia/Tokyo', DAY_START)).toBe('2026-06-16');
    expect(studyDayId(instant, 'America/Los_Angeles', DAY_START)).toBe('2026-06-15');
  });
});

describe('endOfStudyDay', () => {
  it('ya pasada la hora de inicio, el día acaba mañana a esa hora local', () => {
    // 10:00 en Bogotá → mañana 04:00 en Bogotá (09:00 UTC).
    expect(endOfStudyDay(new Date('2026-06-15T15:00:00.250Z'), BOGOTA, DAY_START)).toEqual(
      new Date('2026-06-16T09:00:00Z'),
    );
  });

  it('antes de la hora de inicio, el día acaba hoy a esa hora local', () => {
    // 02:00 en Bogotá → hoy 04:00 en Bogotá.
    expect(endOfStudyDay(new Date('2026-06-15T07:00:00Z'), BOGOTA, DAY_START)).toEqual(
      new Date('2026-06-15T09:00:00Z'),
    );
  });
});

describe('previousStudyDayId', () => {
  it('resta un día a la fecha, también al cruzar mes y año', () => {
    expect(previousStudyDayId('2026-03-01')).toBe('2026-02-28');
    expect(previousStudyDayId('2026-01-01')).toBe('2025-12-31');
  });
});

describe('formatLocalDate', () => {
  it('es la fecha civil del usuario, no la del día de estudio', () => {
    // 01:30 del miércoles 22 de octubre en Bogotá (el ejemplo de la spec es del calendario de
    // 2025: en 2026 el 22 de octubre cae en jueves).
    const now = new Date('2025-10-22T06:30:00Z');

    expect(formatLocalDate(now, BOGOTA)).toBe('Miércoles, 22 de octubre');
    expect(studyDayId(now, BOGOTA, DAY_START)).toBe('2025-10-21');
  });
});

describe('studyDayAt', () => {
  it('reúne el id y el fin del día de estudio de un instante', () => {
    expect(studyDayAt(new Date('2026-06-15T06:30:00Z'), BOGOTA, DAY_START)).toEqual({
      id: '2026-06-14',
      endOfDay: new Date('2026-06-15T09:00:00Z'),
    });
  });
});
