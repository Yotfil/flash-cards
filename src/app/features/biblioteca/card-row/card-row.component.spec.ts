import { ApplicationRef, Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { Card } from '@domain/models/card.model';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { CardsService } from '@services/cards/cards.service';
import { SessionService } from '@services/session/session.service';
import { FakeBookRepository } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { CardRowComponent } from './card-row.component';

// La fila recibe la tarjeta desde la lista del servicio, como en el listado real: así un cambio
// guardado (suspender) vuelve a la fila por el mismo camino.
@Component({
  imports: [CardRowComponent],
  template: `
    @if (cards.sorted()[0]; as card) {
      <app-card-row
        [card]="card"
        [isDuplicate]="isDuplicate()"
        [selectionMode]="selectionMode()"
        [selected]="selected()"
        (edit)="events.push('edit')"
        (toggleSelect)="events.push('toggleSelect')"
        (delete)="events.push('delete')"
      />
    }
  `,
})
class HostComponent {
  readonly cards = inject(CardsService);
  readonly isDuplicate = signal(false);
  readonly selectionMode = signal(false);
  readonly selected = signal(false);
  readonly events: string[] = [];
}

const BASIC = aCard({ id: 'k1', chapterId: 'c1', front: 'to give up', back: 'rendirse' });

async function render(card: Card = BASIC, options: { online?: boolean } = {}) {
  const repository = new FakeCardRepository();
  repository.seed(card);
  const logger = new FakeLogger();
  TestBed.configureTestingModule({
    providers: [
      { provide: CardRepository, useValue: repository },
      { provide: BookRepository, useValue: new FakeBookRepository() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
      { provide: ConnectivityPort, useValue: new FakeConnectivity(options.online ?? true) },
      { provide: Logger, useValue: logger },
    ],
  });
  TestBed.inject(CardsService).openChapter('c1');
  const fixture = TestBed.createComponent(HostComponent);
  const update = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
  };
  await update();
  const element = fixture.nativeElement as HTMLElement;
  const row = () => element.querySelector<HTMLElement>('app-card-row [data-card-row]');
  const menuButton = () => element.querySelector<HTMLButtonElement>('app-action-menu button');
  const menuItems = () =>
    Array.from(document.querySelectorAll<HTMLElement>('.cdk-overlay-container [role="menuitem"]'));
  const openMenu = async () => {
    menuButton()?.click();
    await update();
  };
  const choose = async (label: string) => {
    await openMenu();
    menuItems()
      .find((item) => item.textContent?.trim() === label)
      ?.click();
  };
  const body = () => element.querySelector<HTMLButtonElement>('[data-card-body]');
  return {
    host: fixture.componentInstance,
    repository,
    logger,
    element,
    update,
    row,
    menuButton,
    menuItems,
    openMenu,
    choose,
    body,
  };
}

describe('CardRowComponent', () => {
  it('una básica se lee "anverso → reverso"', async () => {
    const { row } = await render();

    expect(row()?.textContent?.replace(/\s+/g, ' ')).toContain('to give up → rendirse');
  });

  it('una cloze lleva la etiqueta "cloze" y su pregunta compacta', async () => {
    const { row } = await render(
      aCard({
        id: 'k2',
        chapterId: 'c1',
        cardType: 'cloze',
        front: 'El {{gato}} es {{negro}}',
        back: '',
      }),
    );

    expect(row()?.textContent).toContain('cloze');
    expect(row()?.textContent).toContain('El […] es […]');
  });

  it('las repetidas llevan "Repetida" con su nombre accesible', async () => {
    const { row, host, update } = await render();
    expect(row()?.textContent).not.toContain('Repetida');

    host.isDuplicate.set(true);
    await update();

    expect(row()?.textContent).toContain('Repetida');
    expect(row()?.textContent).toContain('Tarjeta repetida');
  });

  it('el icono "Tiene ejemplo" aparece solo con ejemplo y sin su texto', async () => {
    const plain = await render();
    expect(plain.row()?.querySelector('[aria-label="Tiene ejemplo"]')).toBeNull();
    TestBed.resetTestingModule();

    const withExample = await render(aCard({ ...BASIC, example: 'I give up.' }));
    expect(withExample.row()?.querySelector('[aria-label="Tiene ejemplo"]')).not.toBeNull();
    expect(withExample.row()?.textContent).not.toContain('I give up.');
  });

  it('el menú se llama "Acciones de «anverso»" y ofrece Editar, Suspender y Borrar', async () => {
    const { menuButton, openMenu, menuItems } = await render();

    expect(menuButton()?.getAttribute('aria-label')).toBe('Acciones de «to give up»');
    await openMenu();
    expect(menuItems().map((item) => item.textContent?.trim())).toEqual([
      'Editar',
      'Suspender',
      'Borrar',
    ]);
  });

  it('una suspendida ofrece "Reactivar", lleva "Suspendida" y se atenúa', async () => {
    const { row, openMenu, menuItems } = await render(aCard({ ...BASIC, suspended: true }));

    expect(row()?.textContent).toContain('Suspendida');
    expect(row()?.classList).toContain('dimmed');
    await openMenu();
    expect(menuItems().map((item) => item.textContent?.trim())).toContain('Reactivar');
  });

  it('tocar el cuerpo pide editar; Editar y Borrar del menú se emiten', async () => {
    const { body, host, choose, update } = await render();

    body()?.click();
    await choose('Editar');
    await update();
    await choose('Borrar');
    await update();

    expect(host.events).toEqual(['edit', 'edit', 'delete']);
  });

  it('en selección: casilla sin menú, y tocar la fila alterna la selección', async () => {
    const { element, host, update, body, menuButton } = await render();

    host.selectionMode.set(true);
    await update();
    const checkbox = element.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox?.getAttribute('aria-label')).toBe('Seleccionar «to give up»');
    expect(checkbox?.checked).toBe(false);
    expect(menuButton()).toBeNull();

    body()?.click();
    checkbox?.click();
    host.selected.set(true);
    await update();

    expect(host.events).toEqual(['toggleSelect', 'toggleSelect']);
    expect(checkbox?.checked).toBe(true);
  });

  it('suspender deja la fila ocupada mientras guarda y luego la muestra suspendida', async () => {
    const { repository, row, choose, update, menuButton } = await render();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const setSuspended = repository.setSuspended.bind(repository);
    repository.setSuspended = async (...args) => {
      await gate;
      return setSuspended(...args);
    };

    await choose('Suspender');
    await update();
    expect(row()?.getAttribute('aria-busy')).toBe('true');
    expect(menuButton()?.disabled).toBe(true);

    release();
    await update();
    await update();
    expect(row()?.getAttribute('aria-busy')).toBeNull();
    expect(row()?.textContent).toContain('Suspendida');
    expect(repository.cards.get('k1')?.suspended).toBe(true);
  });

  it('si suspender falla, vuelve a activa y lo explica junto a la fila', async () => {
    const { repository, logger, element, row, choose, update } = await render();
    repository.failWith.setSuspended = new Error('offline');

    await choose('Suspender');
    await update();

    expect(row()?.textContent).not.toContain('Suspendida');
    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo guardar. Inténtalo de nuevo.',
    );
    expect(logger.entries.at(-1)?.cause).toBe(repository.failWith.setSuspended);
  });

  it('sin red el menú está deshabilitado', async () => {
    const { menuButton } = await render(BASIC, { online: false });

    expect(menuButton()?.disabled).toBe(true);
  });
});
