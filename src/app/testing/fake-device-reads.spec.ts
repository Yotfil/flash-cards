import { CardState } from '@domain/models/card.model';

import { FakeBookRepository, aBook } from './fake-book-repository';
import { FakeCardRepository, aCard } from './fake-card-repository';
import { FakeChapterRepository, aChapter } from './fake-chapter-repository';
import { FakeDailyStatsRepository, aDailyStats } from './fake-daily-stats-repository';
import { FakePracticePackageRepository, aPackage } from './fake-practice-package-repository';

// Los fakes imitan la caché del dispositivo con su propia lista (`seedOnDevice`), aparte de la del
// servidor (`seed`). `calls` sigue contando las lecturas del servidor (lo que cuesta una visita) y
// `deviceCalls`, las del dispositivo. Sin nada sembrado en el dispositivo, su lectura viene vacía:
// es la primera visita.
describe('fakes · lo guardado en el dispositivo', () => {
  it('libros: el dispositivo y el servidor tienen cada uno su lista y su contador', async () => {
    const books = new FakeBookRepository();
    books.seed(aBook({ id: 'b1', order: 1 }), aBook({ id: 'b2', order: 0 }));
    books.seedOnDevice(aBook({ id: 'b1', order: 1 }));

    expect((await books.listByUser('u1', 'device')).map((book) => book.id)).toEqual(['b1']);
    expect((await books.listByUser('u1')).map((book) => book.id)).toEqual(['b2', 'b1']);
    expect(books.deviceCalls.listByUser).toBe(1);
    expect(books.calls.listByUser).toBe(1);
  });

  it('sin nada sembrado en el dispositivo, su lectura viene vacía (la primera visita)', async () => {
    const books = new FakeBookRepository();
    books.seed(aBook({ id: 'b1' }));

    expect(await books.listByUser('u1', 'device')).toEqual([]);
  });

  it('paquetes de práctica', async () => {
    const packages = new FakePracticePackageRepository();
    packages.seed(aPackage({ id: 'p1' }), aPackage({ id: 'p2' }));
    packages.seedOnDevice(aPackage({ id: 'p1' }));

    expect((await packages.listByUser('u1', 'device')).map((pkg) => pkg.id)).toEqual(['p1']);
    expect(await packages.listByUser('u1')).toHaveLength(2);
    expect(packages.deviceCalls.listByUser).toBe(1);
    expect(packages.calls.listByUser).toBe(1);
  });

  it('capítulos de un libro', async () => {
    const chapters = new FakeChapterRepository();
    chapters.seed(aChapter({ id: 'c1', bookId: 'b1' }), aChapter({ id: 'c2', bookId: 'b1' }));
    chapters.seedOnDevice(
      aChapter({ id: 'c1', bookId: 'b1' }),
      aChapter({ id: 'x', bookId: 'b2' }),
    );

    expect((await chapters.listByBook('u1', 'b1', 'device')).map((c) => c.id)).toEqual(['c1']);
    expect(await chapters.listByBook('u1', 'b1')).toHaveLength(2);
    expect(chapters.deviceCalls.listByBook).toBe(1);
    expect(chapters.calls.listByBook).toBe(1);
  });

  it('tarjetas: las de un capítulo y las listas hasta un instante', async () => {
    const cards = new FakeCardRepository();
    const due = (id: string, chapterId: string, dueAt: string) => {
      const card = aCard({ id, chapterId });
      return {
        ...card,
        scheduling: { ...card.scheduling, state: CardState.Review, due: new Date(dueAt) },
      };
    };
    cards.seed(
      due('k1', 'c1', '2026-10-24T00:00:00Z'),
      due('k2', 'c1', '2026-10-24T00:00:00Z'),
      due('k3', 'c2', '2026-10-30T00:00:00Z'),
    );
    cards.seedOnDevice(
      due('k1', 'c1', '2026-10-24T00:00:00Z'),
      due('k3', 'c2', '2026-10-30T00:00:00Z'),
    );
    const before = new Date('2026-10-25T00:00:00Z');

    expect((await cards.listByChapter('u1', 'c1', 'device')).map((c) => c.id)).toEqual(['k1']);
    expect((await cards.listReady('u1', before, 'device')).map((c) => c.id)).toEqual(['k1']);
    expect(await cards.listReady('u1', before)).toHaveLength(2);
    expect(cards.deviceCalls).toMatchObject({ listByChapter: 1, listReady: 1 });
    expect(cards.calls).toMatchObject({ listByChapter: 0, listReady: 1 });
  });

  it('indicadores de un día', async () => {
    const stats = new FakeDailyStatsRepository();
    stats.seed(aDailyStats({ id: '2026-10-24', reviewsCompleted: 5 }));
    stats.seedOnDevice(aDailyStats({ id: '2026-10-24', reviewsCompleted: 3 }));

    expect((await stats.getByDay('u1', '2026-10-24', 'device'))?.reviewsCompleted).toBe(3);
    expect((await stats.getByDay('u1', '2026-10-24'))?.reviewsCompleted).toBe(5);
    expect(await stats.getByDay('u1', '2026-10-23', 'device')).toBeNull();
    expect(stats.deviceCalls.getByDay).toEqual(['2026-10-24', '2026-10-23']);
    expect(stats.calls.getByDay).toEqual(['2026-10-24']);
  });
});
