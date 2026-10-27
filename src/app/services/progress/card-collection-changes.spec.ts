import { TestBed } from '@angular/core/testing';

import { CardCollectionChanges } from './card-collection-changes';

describe('CardCollectionChanges', () => {
  it('arranca en la versión 0: nada cambió todavía', () => {
    expect(TestBed.inject(CardCollectionChanges).version()).toBe(0);
  });

  it('cada aviso sube la versión', () => {
    const changes = TestBed.inject(CardCollectionChanges);

    changes.notify();
    changes.notify();

    expect(changes.version()).toBe(2);
  });

  it('tras una escritura que sale bien, avisa y entrega su resultado', async () => {
    const changes = TestBed.inject(CardCollectionChanges);

    const result = await changes.afterWrite(Promise.resolve(42));

    expect(result).toBe(42);
    expect(changes.version()).toBe(1);
  });

  it('tras una escritura que falla también avisa (una parte pudo guardarse) y relanza', async () => {
    const changes = TestBed.inject(CardCollectionChanges);
    const failure = new Error('offline');

    await expect(changes.afterWrite(Promise.reject(failure))).rejects.toBe(failure);

    expect(changes.version()).toBe(1);
  });

  it('no avisa antes de que la escritura termine', () => {
    const changes = TestBed.inject(CardCollectionChanges);

    void changes.afterWrite(new Promise<void>(() => undefined));

    expect(changes.version()).toBe(0);
  });
});
