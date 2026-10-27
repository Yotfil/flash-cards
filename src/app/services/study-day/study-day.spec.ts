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

// Madrid cambia de hora a la 01:00 UTC: el 29 de marzo de 2026 las 02:00 pasan a ser las 03:00
// (noche de 23 horas) y el 25 de octubre las 03:00 vuelven a ser las 02:00 (noche de 25 horas).
const MADRID = 'Europe/Madrid';

describe('el día de estudio las noches de cambio de hora', () => {
  it('la noche en que se adelanta la hora, las 04:30 ya son el día nuevo', () => {
    // 04:30 CEST del 29 de marzo.
    expect(studyDayId(new Date('2026-03-29T02:30:00Z'), MADRID, DAY_START)).toBe('2026-03-29');
  });

  it('la noche en que se atrasa la hora, las 03:30 todavía son el día anterior', () => {
    // 03:30 CET del 25 de octubre.
    expect(studyDayId(new Date('2026-10-25T02:30:00Z'), MADRID, DAY_START)).toBe('2026-10-24');
  });

  it('noche de 23 horas: de las 22:00 a las 04:00 van 5 horas', () => {
    expect(endOfStudyDay(new Date('2026-03-28T21:00:00Z'), MADRID, DAY_START)).toEqual(
      new Date('2026-03-29T02:00:00Z'),
    );
  });

  it('noche de 25 horas: de las 22:00 a las 04:00 van 7 horas', () => {
    expect(endOfStudyDay(new Date('2026-10-24T20:00:00Z'), MADRID, DAY_START)).toEqual(
      new Date('2026-10-25T03:00:00Z'),
    );
  });

  it('si la hora de inicio no existe esa noche, el día cambia en el salto', () => {
    // Inicio a las 02:00, que esa noche no existe; la 01:30 CET.
    expect(endOfStudyDay(new Date('2026-03-29T00:30:00Z'), MADRID, 2)).toEqual(
      new Date('2026-03-29T01:00:00Z'),
    );
    expect(studyDayId(new Date('2026-03-29T00:59:59Z'), MADRID, 2)).toBe('2026-03-28');
    expect(studyDayId(new Date('2026-03-29T01:00:00Z'), MADRID, 2)).toBe('2026-03-29');
  });

  it('si la hora de inicio se repite esa noche, el día cambia la primera vez', () => {
    // Inicio a las 02:00, que esa noche se marca dos veces; la 01:30 CEST.
    expect(endOfStudyDay(new Date('2026-10-24T23:30:00Z'), MADRID, 2)).toEqual(
      new Date('2026-10-25T00:00:00Z'),
    );
    // La segunda vez que el reloj marca las 02:30 sigue siendo el mismo día.
    expect(studyDayId(new Date('2026-10-25T01:30:00Z'), MADRID, 2)).toBe('2026-10-25');
  });

  it('el fin del día es justo el instante en que cambia el día, cada media hora de varias noches', () => {
    const nights = [
      [MADRID, '2026-03-29T01:00:00Z'],
      [MADRID, '2026-10-25T01:00:00Z'],
      ['America/Santiago', '2026-09-06T04:00:00Z'],
      ['America/Santiago', '2026-04-05T03:00:00Z'],
      [BOGOTA, '2026-06-15T05:00:00Z'],
    ] as const;
    const HALF_HOUR_MS = 30 * 60 * 1000;
    const mismatches: string[] = [];
    for (const [zone, transition] of nights) {
      for (const startHour of [0, 2, 3, 4]) {
        for (let step = -96; step <= 96; step++) {
          const now = new Date(new Date(transition).getTime() + step * HALF_HOUR_MS);
          const day = studyDayId(now, zone, startHour);
          const end = endOfStudyDay(now, zone, startHour);
          const lastSecond = new Date(end.getTime() - 1000);
          const coherent =
            end > now &&
            studyDayId(lastSecond, zone, startHour) === day &&
            previousStudyDayId(studyDayId(end, zone, startHour)) === day;
          if (!coherent) {
            mismatches.push(`${zone} ${startHour} h ${now.toISOString()} → ${end.toISOString()}`);
          }
        }
      }
    }

    expect(mismatches).toEqual([]);
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
