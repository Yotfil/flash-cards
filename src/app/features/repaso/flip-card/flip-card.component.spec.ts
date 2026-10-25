import { TestBed } from '@angular/core/testing';

import type { Card } from '@domain/models/card.model';
import { aCard } from '@testing/fake-card-repository';

import { FlipCardComponent } from './flip-card.component';

const T0 = new Date('2026-10-24T15:00:00Z');

function render(card: Card, revealed = false) {
  const fixture = TestBed.createComponent(FlipCardComponent);
  fixture.componentRef.setInput('card', card);
  fixture.componentRef.setInput('revealed', revealed);
  const revealRequested = vi.fn();
  fixture.componentInstance.revealRequested.subscribe(revealRequested);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const front = () =>
    element.querySelector('[data-front]')?.textContent?.replace(/\s+/g, ' ').trim();
  const back = () => element.querySelector('[data-back]');
  const showAnswer = () =>
    Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Mostrar respuesta',
    );
  return { fixture, element, front, back, showAnswer, revealRequested };
}

const BASIC = aCard({ front: 'to give up', back: 'rendirse' });

describe('FlipCardComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('momento pregunta: el anverso y "Mostrar respuesta", sin reverso', () => {
    const { front, back, showAnswer } = render(BASIC);

    expect(front()).toBe('to give up');
    expect(showAnswer()).toBeDefined();
    expect(back()?.textContent?.trim()).toBe('');
  });

  it('momento respuesta: la tarjeta se voltea y el reverso se anuncia', () => {
    const { element, back, showAnswer } = render(BASIC, true);

    expect(element.querySelector('.flipped')).not.toBeNull();
    expect(back()?.getAttribute('aria-live')).toBe('polite');
    expect(back()?.textContent).toContain('rendirse');
    expect(showAnswer()).toBeUndefined();
  });

  it('tocar la tarjeta o "Mostrar respuesta" pide revelar', () => {
    const { element, showAnswer, revealRequested } = render(BASIC);
    vi.setSystemTime(new Date(T0.getTime() + 1000));

    element.querySelector<HTMLElement>('[data-card]')?.click();
    showAnswer()?.click();

    expect(revealRequested).toHaveBeenCalledTimes(2);
  });

  it('justo al entrar, tocar la tarjeta no revela (toques accidentales); el botón sí', () => {
    const { element, showAnswer, revealRequested } = render(BASIC);

    element.querySelector<HTMLElement>('[data-card]')?.click();
    expect(revealRequested).not.toHaveBeenCalled();

    showAnswer()?.click();
    expect(revealRequested).toHaveBeenCalledTimes(1);
  });

  it('el ejemplo se lee debajo del reverso', () => {
    const { back } = render(aCard({ ...BASIC, example: 'I gave up smoking.' }), true);

    expect(back()?.querySelector('[data-example]')?.textContent?.trim()).toBe('I gave up smoking.');
  });

  it('una cloze pregunta con huecos y al revelar los muestra en acento, sin reverso', () => {
    const cloze = aCard({ cardType: 'cloze', front: 'El {{gato}} es {{negro}}', back: '' });

    expect(render(cloze).front()).toBe('El […] es […]');
    TestBed.resetTestingModule();

    const { back } = render(cloze, true);
    const filled = Array.from(back()?.querySelectorAll('.text-accent-text') ?? []).map((hole) =>
      hole.textContent?.trim(),
    );
    expect(filled).toEqual(['gato', 'negro']);
    expect(back()?.textContent?.replace(/\s+/g, ' ').trim()).toBe('El gato es negro');
  });

  it('un marcador vacío se queda como texto', () => {
    const cloze = aCard({ cardType: 'cloze', front: 'El {{ }} y el {{gato}}', back: '' });

    expect(render(cloze).front()).toBe('El {{ }} y el […]');
  });

  it('una tarjeta en dirección inversa pregunta igual por su anverso', () => {
    expect(render(aCard({ ...BASIC, direction: 'reverse' })).front()).toBe('to give up');
  });
});
