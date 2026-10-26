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
});
