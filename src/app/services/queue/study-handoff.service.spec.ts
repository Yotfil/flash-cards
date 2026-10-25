import { TestBed } from '@angular/core/testing';

import { aCard } from '@testing/fake-card-repository';

import { StudyHandoffService, type PreparedStudy } from './study-handoff.service';

describe('StudyHandoffService', () => {
  it('entrega una sola vez lo que se preparó', () => {
    const handoff = TestBed.inject(StudyHandoffService);
    const prepared: PreparedStudy = {
      cards: [aCard({ id: 'k1' })],
      source: { kind: 'chapter', bookId: 'b1', chapterId: 'c1' },
    };

    handoff.hand(prepared);

    expect(handoff.take()).toBe(prepared);
    expect(handoff.take()).toBeNull();
  });

  it('sin nada preparado no entrega nada', () => {
    expect(TestBed.inject(StudyHandoffService).take()).toBeNull();
  });
});
