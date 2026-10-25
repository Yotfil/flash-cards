import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { Chapter } from '@domain/models/chapter.model';
import { BookRepository } from '@domain/ports/book.repository';
import { ChapterRepository } from '@domain/ports/chapter.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { SessionService } from '@services/session/session.service';
import { FakeBookRepository } from '@testing/fake-book-repository';
import { FakeChapterRepository, aChapter } from '@testing/fake-chapter-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { ChapterRowComponent } from './chapter-row.component';

async function render(
  chapter: Chapter,
  options: { cards?: number; online?: boolean; failCount?: boolean } = {},
) {
  const repository = new FakeChapterRepository();
  repository.setCardCount(chapter.id, options.cards ?? 0);
  if (options.failCount) {
    repository.failWith.countCards = new Error('offline');
  }
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ChapterRepository, useValue: repository },
      { provide: BookRepository, useValue: new FakeBookRepository() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
      { provide: ConnectivityPort, useValue: new FakeConnectivity(options.online ?? true) },
    ],
  });
  const fixture = TestBed.createComponent(ChapterRowComponent);
  fixture.componentRef.setInput('chapter', chapter);
  fixture.componentRef.setInput('position', 2);
  fixture.componentRef.setInput('bookId', 'b1');
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement, repository };
}

const BASICS = aChapter({ id: 'c1', bookId: 'b1', name: 'Básicos' });

describe('ChapterRowComponent', () => {
  it('muestra la posición y el nombre, o "Capítulo sin nombre"', async () => {
    const named = await render(BASICS);
    expect(named.element.textContent).toContain('2');
    expect(named.element.textContent).toContain('Básicos');
    TestBed.resetTestingModule();

    const unnamed = await render(aChapter({ id: 'c1', name: '' }));
    expect(unnamed.element.textContent).toContain('Capítulo sin nombre');
  });

  it.each([
    [42, '42 tarjetas'],
    [1, '1 tarjeta'],
  ])('con %s tarjetas dice "%s"', async (cards, text) => {
    const { element } = await render(BASICS, { cards });

    expect(element.textContent).toContain(text);
  });

  it('sin red no pide el conteo ni muestra la línea', async () => {
    const { element, repository } = await render(BASICS, { cards: 42, online: false });

    expect(repository.calls.countCards).toBe(0);
    expect(element.textContent).not.toContain('tarjeta');
  });

  it('si el conteo falla no hay línea ni aviso', async () => {
    const { element } = await render(BASICS, { failCount: true });

    expect(element.textContent).not.toContain('tarjeta');
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('el enlace lleva al capítulo y los botones quedan fuera del enlace', async () => {
    const { element } = await render(BASICS);

    const link = element.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/biblioteca/b1/c1');
    expect(link?.querySelector('button')).toBeNull();
  });

  it('nombra sus botones con el capítulo y emite cada acción', async () => {
    const { fixture, element } = await render(BASICS);
    const rename = vi.fn();
    const removal = vi.fn();
    fixture.componentInstance.renameRequested.subscribe(rename);
    fixture.componentInstance.deleteRequested.subscribe(removal);

    element.querySelector<HTMLButtonElement>('[aria-label="Renombrar Básicos"]')?.click();
    element.querySelector<HTMLButtonElement>('[aria-label="Borrar Básicos"]')?.click();

    expect(rename).toHaveBeenCalledTimes(1);
    expect(removal).toHaveBeenCalledTimes(1);
  });
});
