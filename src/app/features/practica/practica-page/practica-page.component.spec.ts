import { Location } from '@angular/common';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { CardRepository } from '@domain/ports/card.repository';
import { DailyStatsRepository } from '@domain/ports/daily-stats.repository';
import { GradePersistencePort } from '@domain/ports/grade-persistence.port';
import type { QuizQuestion } from '@services/practice/generate-quiz';
import {
  PracticeHandoffService,
  type PracticeOrigin,
} from '@services/practice/practice-handoff.service';
import { PracticeSessionService } from '@services/practice/practice-session.service';
import { FakeCardRepository } from '@testing/fake-card-repository';
import { FakeDailyStatsRepository } from '@testing/fake-daily-stats-repository';
import { FakeGradePersistence } from '@testing/fake-grade-persistence';

import { PracticaPageComponent } from './practica-page.component';

@Component({ template: '' })
class BlankPageComponent {}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    cardId: 'k1',
    type: 'multiple-choice',
    prompt: 'to give up',
    answer: 'rendirse',
    acceptedAnswers: ['rendirse'],
    options: ['buscar', 'rendirse', 'posponer', 'continuar'],
  },
  {
    id: 'q2',
    cardId: 'k2',
    type: 'written',
    prompt: 'to look up',
    answer: 'buscar',
    acceptedAnswers: ['buscar'],
  },
];
const CHAPTER: PracticeOrigin = { kind: 'chapter', bookId: 'b1', chapterId: 'c1' };
/** Opción múltiple, escribir y otra vez opción múltiple: para seguir el foco al avanzar. */
const THREE_QUESTIONS: QuizQuestion[] = [
  ...QUESTIONS,
  {
    id: 'q3',
    cardId: 'k3',
    type: 'multiple-choice',
    prompt: 'to put off',
    answer: 'posponer',
    acceptedAnswers: ['posponer'],
    options: ['posponer', 'rendirse', 'buscar', 'continuar'],
  },
];

async function open(
  options: {
    origin?: PracticeOrigin;
    handOff?: boolean;
    questions?: QuizQuestion[];
    /** Pantallas por las que pasó antes de practicar (la última, el origen). */
    from?: string[];
  } = {},
) {
  const cards = new FakeCardRepository();
  const stats = new FakeDailyStatsRepository();
  const grades = new FakeGradePersistence();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'practicar', component: PracticaPageComponent },
        { path: 'biblioteca', component: BlankPageComponent },
        { path: 'biblioteca/:bookId', component: BlankPageComponent },
        { path: 'biblioteca/:bookId/:chapterId', component: BlankPageComponent },
      ]),
      { provide: CardRepository, useValue: cards },
      { provide: DailyStatsRepository, useValue: stats },
      { provide: GradePersistencePort, useValue: grades },
    ],
  });
  const handoff = TestBed.inject(PracticeHandoffService);
  const harness = await RouterTestingHarness.create();
  // Lo hace el arranque de la app; sin esto el router de las pruebas no oye el "atrás".
  TestBed.inject(Router).setUpLocationChangeListener();
  for (const url of options.from ?? []) {
    await harness.navigateByUrl(url);
  }
  if (options.handOff ?? true) {
    handoff.hand({ questions: options.questions ?? QUESTIONS, origin: options.origin ?? CHAPTER });
  }
  const session = TestBed.inject(PracticeSessionService);
  await harness.navigateByUrl('/practicar');
  const update = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    harness.detectChanges();
  };
  await update();
  const page = () => harness.routeNativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(page()?.querySelectorAll('button') ?? []).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  const click = async (text: string) => {
    button(text)?.click();
    await update();
  };
  const write = async (text: string) => {
    const input = page().querySelector('app-written-question input') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    input.form?.dispatchEvent(new Event('submit', { cancelable: true }));
    await update();
  };
  const url = () => TestBed.inject(Router).url;
  const history = async (move: 'back' | 'forward') => {
    TestBed.inject(Location)[move]();
    await new Promise((resolve) => setTimeout(resolve, 60));
    await update();
  };
  return {
    history,
    harness,
    handoff,
    session,
    cards,
    stats,
    grades,
    update,
    page,
    button,
    click,
    write,
    url,
  };
}

describe('PracticaPageComponent', () => {
  it('toma el quiz entregado (una sola vez) y empieza en la primera, sin navegación', async () => {
    const { handoff, page } = await open();
    const bar = page().querySelector('app-session-top-bar');

    expect(handoff.prepared()).toBeNull();
    expect(bar?.textContent).toContain('1 / 2');
    expect(bar?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('0');
    expect(page().querySelector('app-multiple-choice-question')?.textContent).toContain(
      'to give up',
    );
    expect(page().querySelector('app-main-nav')).toBeNull();
  });

  it('sin quiz entregado vuelve a la Biblioteca', async () => {
    const { url } = await open({ handOff: false });

    expect(url()).toBe('/biblioteca');
  });

  it('no se avanza sin responder; al responder, el feedback, la barra y "Siguiente"', async () => {
    const { page, button, click } = await open();

    expect(button('Siguiente')).toBeUndefined();
    await click('buscar');

    expect(page().querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'La respuesta era «rendirse».',
    );
    expect(
      page()
        .querySelector('app-session-top-bar [role="progressbar"]')
        ?.getAttribute('aria-valuenow'),
    ).toBe('50');
    expect(button('Siguiente')).toBeDefined();
  });

  it('la segunda es de escribir; la última dice "Ver resultado" y lleva al resumen', async () => {
    const { page, button, click, write } = await open();
    await click('rendirse');
    await click('Siguiente');

    expect(page().querySelector('app-written-question')?.textContent).toContain('to look up');
    expect(page().querySelector('app-session-top-bar')?.textContent).toContain('2 / 2');
    await write('Buscar');
    expect(page().querySelector('[role="status"]')?.textContent?.trim()).toBe('¡Correcto!');
    expect(button('Siguiente')).toBeUndefined();
    await click('Ver resultado');

    expect(page().querySelector('app-practice-summary')?.textContent).toContain(
      'Acertaste 2 de 2.',
    );
  });

  it('el foco acompaña a la práctica: enunciado, "Siguiente", campo y enunciado de la siguiente', async () => {
    const { page, click, write } = await open({ questions: THREE_QUESTIONS });
    const focused = () => document.activeElement as HTMLElement | null;

    expect(focused()?.tagName).toBe('H2');
    expect(focused()?.textContent?.trim()).toBe('to give up');
    await click('rendirse');
    expect(focused()?.textContent?.trim()).toBe('Siguiente');
    await click('Siguiente');
    expect(focused()).toBe(page().querySelector('app-written-question input'));
    await write('buscar');
    expect(focused()?.textContent?.trim()).toBe('Siguiente');
    await click('Siguiente');
    expect(focused()?.tagName).toBe('H2');
    expect(focused()?.textContent?.trim()).toBe('to put off');
    await click('posponer');
    expect(focused()?.textContent?.trim()).toBe('Ver resultado');
  });

  it('al ver el resultado, el foco va al título del resumen', async () => {
    const { click, write } = await open();
    await click('rendirse');
    await click('Siguiente');
    await write('buscar');
    await click('Ver resultado');

    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.textContent?.trim()).toBe('¡Práctica completada!');
  });

  it('"Salir" regresa al capítulo con el historial: atrás lleva al libro y adelante no muestra la práctica', async () => {
    const { click, history, url } = await open({
      from: ['/biblioteca', '/biblioteca/b1', '/biblioteca/b1/c1'],
    });

    await click('Salir');
    expect(url()).toBe('/biblioteca/b1/c1');

    await history('back');
    expect(url()).toBe('/biblioteca/b1');

    await history('forward');
    await history('forward');
    expect(url()).toBe('/biblioteca');
  });

  it('"Volver al libro" regresa con el historial: atrás lleva a lo anterior al libro', async () => {
    const { click, write, history, url } = await open({
      origin: { kind: 'book', bookId: 'b1' },
      // Antes del libro, otro libro: así no se confunde con la redirección a la Biblioteca.
      from: ['/biblioteca/b2', '/biblioteca/b1'],
    });
    await click('rendirse');
    await click('Siguiente');
    await write('buscar');
    await click('Ver resultado');

    await click('Volver al libro');
    expect(url()).toBe('/biblioteca/b1');

    await history('back');
    expect(url()).toBe('/biblioteca/b2');
  });

  it('el resumen vuelve al capítulo de origen', async () => {
    const { click, write, url } = await open();
    await click('buscar');
    await click('Siguiente');
    await write('nada');
    await click('Ver resultado');

    await click('Volver al capítulo');

    expect(url()).toBe('/biblioteca/b1/c1');
  });

  it('desde un libro, "Salir" vuelve al libro y la práctica se vacía', async () => {
    const { session, click, url } = await open({ origin: { kind: 'book', bookId: 'b1' } });

    await click('Salir');

    expect(url()).toBe('/biblioteca/b1');
    expect(session.current()).toBeUndefined();
    expect(session.origin()).toBeNull();
  });

  it('completar una práctica no escribe nada', async () => {
    const { cards, stats, grades, click, write } = await open();
    await click('rendirse');
    await click('Siguiente');
    await write('buscar');
    await click('Ver resultado');

    expect(Object.values(cards.calls).every((count) => count === 0)).toBe(true);
    expect(stats.calls.getByDay).toEqual([]);
    expect(grades.records).toEqual([]);
  });
});
