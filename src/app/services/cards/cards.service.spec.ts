import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { SessionState } from '@domain/models/session-state';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { initialCardScheduling } from '@domain/models/card-scheduling';
import { PartialDeletionError } from '@domain/models/partial-deletion-error';
import { BooksService } from '@services/books/books.service';
import { SessionService } from '@services/session/session.service';
import { FakeBookRepository } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { CardsService } from './cards.service';

function setup(state: SessionState = { kind: 'active', user: aUser({ id: 'u1' }) }) {
  const repository = new FakeCardRepository();
  TestBed.configureTestingModule({
    providers: [
      { provide: CardRepository, useValue: repository },
      { provide: BookRepository, useValue: new FakeBookRepository() },
      { provide: SessionService, useValue: new FakeSessionService(state) },
      { provide: ConnectivityPort, useValue: new FakeConnectivity() },
    ],
  });
  const service = TestBed.inject(CardsService);
  const settle = async () => {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  return { service, repository, settle };
}

describe('CardsService · recurso', () => {
  it('openChapter lee las tarjetas con el uid de la sesión y, repetido, relee', async () => {
    const { service, repository, settle } = setup();
    repository.seed(aCard({ id: 'k1', chapterId: 'c1' }), aCard({ id: 'otra', chapterId: 'c2' }));

    service.openChapter('c1');
    await settle();
    service.openChapter('c1');
    await settle();

    expect(repository.listedUids).toEqual(['u1', 'u1']);
    expect(service.cards.value()?.map((card) => card.id)).toEqual(['k1']);
  });

  it('si el repositorio falla, el recurso queda en error', async () => {
    const { service, repository, settle } = setup();
    repository.failWith.listByChapter = new Error('offline');

    service.openChapter('c1');
    await settle();

    expect(service.cards.status()).toBe('error');
  });

  it('sin sesión falla con un error explícito y no lee', async () => {
    const { service, repository, settle } = setup({ kind: 'signedOut' });

    service.openChapter('c1');
    await settle();

    expect(service.cards.error()?.message).toBe('No hay una sesión activa.');
    expect(repository.calls.listByChapter).toBe(0);
  });

  it('el orden y las repetidas se derivan de la lista', async () => {
    const { service, repository, settle } = setup();
    repository.seed(
      aCard({ id: 'b', chapterId: 'c1', front: 'banana', back: 'fruta' }),
      aCard({ id: 'a1', chapterId: 'c1', front: 'apple', back: 'manzana' }),
      aCard({ id: 'a2', chapterId: 'c1', front: 'Apple', back: ' manzana' }),
    );

    service.openChapter('c1');
    await settle();

    expect(service.sorted().map((card) => card.front)).toEqual(['apple', 'Apple', 'banana']);
    expect([...service.duplicateIds()].sort()).toEqual(['a1', 'a2']);
  });
});

describe('CardsService · crear y editar', () => {
  async function opened(cards = [aCard({ id: 'k1', chapterId: 'c1' })]) {
    const context = setup();
    context.repository.seed(...cards);
    context.service.openChapter('c1');
    await context.settle();
    const changeCardCount = vi.spyOn(TestBed.inject(BooksService), 'changeCardCount');
    return { ...context, changeCardCount };
  }

  it('crear entrega una tarjeta nueva, independiente y lista, recortada y sin campos vacíos', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const now = new Date('2026-06-15T10:30:00.000Z');
    vi.setSystemTime(now);
    try {
      const { service, repository, changeCardCount } = await opened();

      const first = await service.create('b1', 'c1', {
        cardType: 'basic',
        front: '  to give up ',
        back: ' rendirse  ',
        example: '   ',
      });
      const second = await service.create('b1', 'c1', { cardType: 'basic', front: 'a', back: 'b' });

      expect(first).toMatchObject({
        bookId: 'b1',
        chapterId: 'c1',
        direction: 'forward',
        suspended: false,
        front: 'to give up',
        back: 'rendirse',
        scheduling: initialCardScheduling(now),
      });
      expect(first.noteId).not.toBe('');
      expect(first.noteId).not.toBe(second.noteId);
      expect(repository.cards.get(first.id)).not.toHaveProperty('example');
      expect(repository.cards.get(first.id)).not.toHaveProperty('cardType');
      expect(service.cards.value()?.map((card) => card.id)).toContain(first.id);
      expect(changeCardCount).toHaveBeenCalledWith('b1', 1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('una cloze guarda su tipo y el reverso vacío', async () => {
    const { service } = await opened();

    const card = await service.create('b1', 'c1', {
      cardType: 'cloze',
      front: 'El {{gato}}',
      back: 'x',
    });

    expect(card).toMatchObject({ cardType: 'cloze', front: 'El {{gato}}', back: '' });
  });

  it('crear varias suma al libro cuántas; una lista vacía no escribe', async () => {
    const { service, repository, changeCardCount } = await opened();
    const draft = { cardType: 'basic' as const, front: 'a', back: 'b' };

    const created = await service.createMany('b1', 'c1', [draft, draft, draft]);
    expect(created).toHaveLength(3);
    expect(changeCardCount).toHaveBeenCalledWith('b1', 3);

    await service.createMany('b1', 'c1', []);
    expect(repository.calls.createMany).toBe(1);
  });

  it('editar envía solo el contenido y conserva programación y suspensión', async () => {
    const original = aCard({ id: 'k1', chapterId: 'c1', example: 'viejo', suspended: true });
    const { service, repository } = await opened([original]);

    const updated = await service.update('k1', {
      cardType: 'basic',
      front: ' to give in ',
      back: 'ceder',
      example: '  ',
    });

    expect(repository.contentChanges).toEqual([
      { cardId: 'k1', changes: { front: 'to give in', back: 'ceder', example: null } },
    ]);
    expect(updated).toMatchObject({
      front: 'to give in',
      suspended: true,
      scheduling: original.scheduling,
    });
    expect(updated).not.toHaveProperty('example');
    expect(service.cards.value()?.[0]?.front).toBe('to give in');
  });
});

describe('CardsService · suspender y borrar', () => {
  async function opened() {
    const context = setup();
    context.repository.seed(
      aCard({ id: 'k1', chapterId: 'c1' }),
      aCard({ id: 'k2', chapterId: 'c1' }),
      aCard({ id: 'k3', chapterId: 'c1' }),
    );
    context.service.openChapter('c1');
    await context.settle();
    const changeCardCount = vi.spyOn(TestBed.inject(BooksService), 'changeCardCount');
    const ids = () => context.service.cards.value()?.map((card) => card.id);
    return { ...context, changeCardCount, ids };
  }

  it('suspender se refleja en la lista; si falla, relanza sin cambiar nada', async () => {
    const { service, repository } = await opened();

    await service.setSuspended('k1', true);
    expect(service.cards.value()?.find((card) => card.id === 'k1')?.suspended).toBe(true);

    repository.failWith.setSuspended = new Error('offline');
    await expect(service.setSuspended('k2', true)).rejects.toThrow('offline');
    expect(service.cards.value()?.find((card) => card.id === 'k2')?.suspended).toBe(false);
  });

  it('borrar una la quita tras el éxito y resta 1 al libro', async () => {
    const { service, changeCardCount, ids } = await opened();

    await service.remove('b1', 'k1');

    expect(ids()).toEqual(['k2', 'k3']);
    expect(changeCardCount).toHaveBeenCalledWith('b1', -1);
  });

  it('borrar varias deja solo las demás y resta cuántas', async () => {
    const { service, changeCardCount, ids } = await opened();

    expect(await service.removeMany('b1', ['k1', 'k3'])).toBe(2);

    expect(ids()).toEqual(['k2']);
    expect(changeCardCount).toHaveBeenCalledWith('b1', -2);
  });

  it('borrar una lista vacía no escribe', async () => {
    const { service, repository } = await opened();

    expect(await service.removeMany('b1', [])).toBe(0);
    expect(repository.calls.deleteManyWithCount).toBe(0);
  });

  it('si el borrado falla relanza y la lista no cambia', async () => {
    const { service, repository, changeCardCount, ids } = await opened();
    repository.failWith.deleteWithCount = new Error('offline');
    repository.failWith.deleteManyWithCount = new Error('offline');

    await expect(service.remove('b1', 'k1')).rejects.toThrow('offline');
    await expect(service.removeMany('b1', ['k2'])).rejects.toThrow('offline');

    expect(ids()).toEqual(['k1', 'k2', 'k3']);
    expect(changeCardCount).not.toHaveBeenCalled();
  });

  it('si el borrado se corta a mitad, quita y descuenta solo las ya borradas, y relanza', async () => {
    const { service, repository, changeCardCount, ids } = await opened();
    const failure = new PartialDeletionError(['k1'], new Error('offline'));
    repository.failWith.deleteManyWithCount = failure;

    await expect(service.removeMany('b1', ['k1', 'k3'])).rejects.toBe(failure);

    expect(ids()).toEqual(['k2', 'k3']);
    expect(changeCardCount).toHaveBeenCalledWith('b1', -1);
  });
});

describe('CardsService · reemplazar las del capítulo', () => {
  async function opened() {
    const context = setup();
    context.repository.seed(
      aCard({ id: 'k1', chapterId: 'c1' }),
      aCard({ id: 'k2', chapterId: 'c1' }),
    );
    context.service.openChapter('c1');
    await context.settle();
    const changeCardCount = vi.spyOn(TestBed.inject(BooksService), 'changeCardCount');
    return { ...context, changeCardCount };
  }
  const drafts = ['a', 'b', 'c'].map((front) => ({ cardType: 'basic' as const, front, back: 'x' }));

  it('borra las cargadas, crea las nuevas, deja el recurso con ellas y suma la diferencia', async () => {
    const { service, repository, changeCardCount } = await opened();
    const replace = vi.spyOn(repository, 'replaceInChapter');

    await service.replaceAll('b1', 'c1', drafts);

    expect(replace.mock.calls[0]?.[3]).toEqual(['k1', 'k2']);
    expect(service.cards.value()?.map((card) => card.front)).toEqual(['a', 'b', 'c']);
    expect(changeCardCount).toHaveBeenCalledWith('b1', 1);
  });

  it('si el almacén falla, nada cambia', async () => {
    const { service, repository, changeCardCount } = await opened();
    repository.failWith.replaceInChapter = new Error('offline');

    await expect(service.replaceAll('b1', 'c1', drafts)).rejects.toThrow('offline');

    expect(service.cards.value()?.map((card) => card.id)).toEqual(['k1', 'k2']);
    expect(changeCardCount).not.toHaveBeenCalled();
  });
});
