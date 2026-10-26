import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { Card } from '@domain/models/card.model';
import { PartialDeletionError } from '@domain/models/partial-deletion-error';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { SessionService } from '@services/session/session.service';
import {
  allowDialogFocusInJsdom,
  dialogButton,
  openDialog,
  typeInto,
} from '@testing/dialog-test-helpers';
import { FakeBookRepository } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { CardListComponent } from './card-list.component';

async function render(
  options: { cards?: Card[]; online?: boolean; failWith?: unknown; holdList?: boolean } = {},
) {
  const repository = new FakeCardRepository();
  repository.seed(...(options.cards ?? []));
  if (options.failWith) {
    repository.failWith.listByChapter = options.failWith;
  }
  let releaseList: () => void = () => undefined;
  if (options.holdList) {
    const gate = new Promise<void>((resolve) => (releaseList = resolve));
    const list = repository.listByChapter.bind(repository);
    // Solo el servidor espera: lo guardado en el dispositivo responde al instante.
    repository.listByChapter = async (uid, chapterId, source) => {
      if (source !== 'device') {
        await gate;
      }
      return list(uid, chapterId, source);
    };
  }
  TestBed.configureTestingModule({
    providers: [
      { provide: CardRepository, useValue: repository },
      { provide: BookRepository, useValue: new FakeBookRepository() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
      { provide: ConnectivityPort, useValue: new FakeConnectivity(options.online ?? true) },
      { provide: Logger, useValue: new FakeLogger() },
    ],
  });
  const fixture = TestBed.createComponent(CardListComponent);
  fixture.componentRef.setInput('bookId', 'b1');
  fixture.componentRef.setInput('chapterId', 'c1');
  const contentsChanged = vi.fn();
  const importRequested = vi.fn();
  fixture.componentInstance.contentsChanged.subscribe(contentsChanged);
  fixture.componentInstance.importRequested.subscribe(importRequested);
  const update = async (waitForStable = true) => {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    if (waitForStable) {
      await TestBed.inject(ApplicationRef).whenStable();
    }
    fixture.detectChanges();
  };
  await update(!options.holdList);
  const element = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  const rows = () =>
    Array.from(element.querySelectorAll('app-card-row [data-card-body] > span:first-child')).map(
      (row) => row.textContent?.replace(/\s+/g, ' ').trim(),
    );
  const rowBody = (index: number) =>
    element.querySelectorAll<HTMLButtonElement>('app-card-row [data-card-body]')[index];
  const chooseInRowMenu = async (index: number, label: string) => {
    element
      .querySelectorAll<HTMLButtonElement>('app-card-row app-action-menu button')
      [index]?.click();
    await update();
    Array.from(document.querySelectorAll<HTMLElement>('.cdk-overlay-container [role="menuitem"]'))
      .find((item) => item.textContent?.trim() === label)
      ?.click();
    await update();
  };
  const rowCheckboxes = () =>
    Array.from(element.querySelectorAll<HTMLInputElement>('app-card-row input[type="checkbox"]'));
  const selectAll = () =>
    Array.from(element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).find(
      (checkbox) => checkbox.closest('label')?.textContent?.trim() === 'Seleccionar todas',
    );
  const counter = () => element.querySelector('[aria-live="polite"]')?.textContent?.trim();
  return {
    fixture,
    element,
    repository,
    update,
    button,
    rows,
    rowBody,
    chooseInRowMenu,
    rowCheckboxes,
    selectAll,
    counter,
    contentsChanged,
    importRequested,
    releaseList,
  };
}

const FIVE = [
  aCard({ id: 'k1', front: 'banana', back: 'fruta' }),
  aCard({ id: 'k2', front: 'Apple', back: 'manzana' }),
  aCard({ id: 'k3', front: 'apple', back: 'fruta roja' }),
  aCard({ id: 'k4', front: 'Banana ', back: 'FRUTA' }),
  aCard({ id: 'k5', front: 'cherry', back: 'cereza' }),
];

describe('CardListComponent · estados', () => {
  it('al iniciar lee las tarjetas del capítulo y, mientras tanto, solo muestra el esqueleto', async () => {
    const { element, button, repository, releaseList, update } = await render({
      cards: FIVE,
      holdList: true,
    });

    expect(element.querySelector('app-skeleton[aria-busy="true"]')).not.toBeNull();
    expect(button('Nueva tarjeta')).toBeUndefined();

    releaseList();
    await update();
    expect(repository.calls.listByChapter).toBe(1);
  });

  it('si la lectura falla: "No pudimos cargar las tarjetas" con Reintentar, nunca el vacío', async () => {
    const { element, button, repository, update, rows } = await render({
      cards: FIVE,
      failWith: new Error('offline'),
    });

    expect(element.textContent).toContain('No pudimos cargar las tarjetas');
    expect(element.textContent).not.toContain('Este capítulo aún no tiene tarjetas');

    delete repository.failWith.listByChapter;
    button('Reintentar')?.click();
    await update();
    expect(rows()).toHaveLength(5);
  });

  it('vacío: invita a crear o importar, sin "Seleccionar"', async () => {
    const { element, button, importRequested } = await render();

    expect(element.textContent).toContain('Este capítulo aún no tiene tarjetas');
    expect(element.textContent).toContain('Escribe una o pega varias de golpe.');
    expect(button('Crear tarjeta')).toBeDefined();
    expect(button('Seleccionar')).toBeUndefined();

    button('Importar tarjetas')?.click();
    expect(importRequested).toHaveBeenCalledTimes(1);
  });

  it('con tarjetas: cabecera de acciones, filas ordenadas y repetidas marcadas', async () => {
    const { element, button, rows } = await render({ cards: FIVE });

    expect(button('Seleccionar')).toBeDefined();
    expect(button('Importar tarjetas')).toBeDefined();
    expect(button('Nueva tarjeta')).toBeDefined();
    expect(rows()).toEqual([
      'apple → fruta roja',
      'Apple → manzana',
      'banana → fruta',
      'Banana → FRUTA',
      'cherry → cereza',
    ]);
    expect(element.querySelectorAll('app-card-row')).toHaveLength(5);
    expect(element.textContent?.match(/Tarjeta repetida/g)).toHaveLength(2);
  });

  it('sin red: "Nueva tarjeta" y "Seleccionar" deshabilitados, la lista sigue visible', async () => {
    const { button, rows } = await render({ cards: FIVE, online: false });

    expect(button('Nueva tarjeta')?.disabled).toBe(true);
    expect(button('Seleccionar')?.disabled).toBe(true);
    expect(rows()).toHaveLength(5);
  });
});

describe('CardListComponent · crear, editar y borrar', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  it('"Nueva tarjeta" abre el formulario con las del capítulo y la creada aparece', async () => {
    const { button, update, rows } = await render({ cards: FIVE });

    button('Nueva tarjeta')?.click();
    await update();
    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Nueva tarjeta');
    typeInto('#card-front', 'cherry');
    typeInto('#card-back', 'cereza');
    await update();
    expect(openDialog().querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Ya tienes una tarjeta igual en este capítulo.',
    );
    typeInto('#card-front', 'date');
    typeInto('#card-back', 'dátil');
    await update();
    openDialog().querySelector('form')?.dispatchEvent(new Event('submit'));
    await update();

    expect(rows()).toContain('date → dátil');
  });

  it('tocar una fila abre "Editar tarjeta" con ella y el cambio se refleja', async () => {
    const { rowBody, update, rows } = await render({ cards: FIVE });

    rowBody(4)?.click();
    await update();
    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Editar tarjeta');
    expect(openDialog().querySelector<HTMLTextAreaElement>('#card-front')?.value).toBe('cherry');
    typeInto('#card-back', 'cereza roja');
    await update();
    openDialog().querySelector('form')?.dispatchEvent(new Event('submit'));
    await update();

    expect(rows().at(-1)).toBe('cherry → cereza roja');
  });

  it('borrar confirma con el anverso y el aviso; cancelar no cambia nada', async () => {
    const { chooseInRowMenu, update, rows, repository, contentsChanged } = await render({
      cards: FIVE,
    });

    await chooseInRowMenu(4, 'Borrar');
    expect(openDialog().textContent).toContain('¿Borrar esta tarjeta?');
    expect(openDialog().textContent).toContain('cherry');
    expect(openDialog().textContent).toContain(
      'Se pierde su progreso de estudio. No se puede deshacer.',
    );
    dialogButton('Cancelar')?.click();
    await update();

    expect(rows()).toHaveLength(5);
    expect(repository.calls.deleteWithCount).toBe(0);
    expect(contentsChanged).not.toHaveBeenCalled();
  });

  it('una cloze se confirma con su pregunta compacta', async () => {
    const { chooseInRowMenu } = await render({
      cards: [aCard({ id: 'k9', cardType: 'cloze', front: 'El {{gato}} es negro', back: '' })],
    });

    await chooseInRowMenu(0, 'Borrar');

    expect(openDialog().textContent).toContain('El […] es negro');
  });

  it('confirmar quita la fila y avisa; si falla, la fila sigue con el error', async () => {
    const { chooseInRowMenu, update, rows, repository, contentsChanged } = await render({
      cards: FIVE,
    });

    await chooseInRowMenu(4, 'Borrar');
    dialogButton('Borrar')?.click();
    await update();
    expect(rows()).not.toContain('cherry → cereza');
    expect(contentsChanged).toHaveBeenCalledTimes(1);

    repository.failWith.deleteWithCount = new Error('offline');
    await chooseInRowMenu(0, 'Borrar');
    dialogButton('Borrar')?.click();
    await update();
    expect(openDialog().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo borrar la tarjeta. Inténtalo de nuevo.',
    );
    expect(rows()).toHaveLength(4);
    expect(contentsChanged).toHaveBeenCalledTimes(1);
  });
});

describe('CardListComponent · selección', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  async function selecting(options: { online?: boolean } = {}) {
    const context = await render({ cards: FIVE, ...options });
    context.button('Seleccionar')?.click();
    await context.update();
    return context;
  }

  it('entrar muestra casillas y la barra, y oculta menús, Importar y Nueva tarjeta', async () => {
    const { element, button, rowCheckboxes, counter } = await selecting();

    expect(rowCheckboxes()).toHaveLength(5);
    expect(counter()).toBe('0 seleccionadas');
    expect(button('Eliminar')?.disabled).toBe(true);
    expect(element.querySelector('app-action-menu')).toBeNull();
    expect(button('Importar tarjetas')).toBeUndefined();
    expect(button('Nueva tarjeta')).toBeUndefined();
  });

  it('tocar filas las marca con plural real y habilita "Eliminar"', async () => {
    const { rowBody, rowCheckboxes, update, counter, button } = await selecting();

    rowBody(0)?.click();
    await update();
    expect(counter()).toBe('1 seleccionada');
    expect(rowCheckboxes()[0]?.checked).toBe(true);
    expect(button('Eliminar')?.disabled).toBe(false);

    rowCheckboxes()[1]?.click();
    rowBody(2)?.click();
    await update();
    expect(counter()).toBe('3 seleccionadas');
  });

  it('"Seleccionar todas" marca las 5 y, otra vez, ninguna', async () => {
    const { selectAll, update, counter } = await selecting();

    selectAll()?.click();
    await update();
    expect(counter()).toBe('5 seleccionadas');
    expect(selectAll()?.checked).toBe(true);

    selectAll()?.click();
    await update();
    expect(counter()).toBe('0 seleccionadas');
  });

  it('"Cancelar selección" sale del modo y, al volver, no hay ninguna marcada', async () => {
    const { rowBody, button, update, counter, rowCheckboxes } = await selecting();
    rowBody(0)?.click();
    rowBody(1)?.click();
    await update();

    button('Cancelar selección')?.click();
    await update();
    expect(rowCheckboxes()).toHaveLength(0);
    expect(button('Nueva tarjeta')).toBeDefined();

    button('Seleccionar')?.click();
    await update();
    expect(counter()).toBe('0 seleccionadas');
  });

  it('salir de la pantalla limpia la selección', async () => {
    const first = await selecting();
    first.rowBody(0)?.click();
    await first.update();
    first.fixture.destroy();

    const second = TestBed.createComponent(CardListComponent);
    second.componentRef.setInput('bookId', 'b1');
    second.componentRef.setInput('chapterId', 'c1');
    await first.update();
    second.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    second.detectChanges();

    const element = second.nativeElement as HTMLElement;
    expect(element.querySelectorAll('app-card-row input[type="checkbox"]')).toHaveLength(0);
  });

  it('"Eliminar" confirma en plural con "Borrar 4"; confirmar deja las demás y cierra el modo', async () => {
    const { rowBody, button, update, rows, rowCheckboxes, contentsChanged } = await selecting();
    for (const index of [0, 1, 2, 3]) {
      rowBody(index)?.click();
    }
    await update();

    button('Eliminar')?.click();
    await update();
    expect(openDialog().textContent).toContain('¿Borrar las tarjetas seleccionadas?');
    expect(openDialog().textContent).toContain(
      'Se eliminarán 4 tarjetas de este capítulo, con su progreso de estudio. No se puede deshacer.',
    );
    dialogButton('Borrar 4')?.click();
    await update();

    expect(rows()).toEqual(['cherry → cereza']);
    expect(rowCheckboxes()).toHaveLength(0);
    expect(contentsChanged).toHaveBeenCalledTimes(1);
  });

  it('si el borrado masivo falla, sigue el error y la selección activa', async () => {
    const { rowBody, button, update, rows, counter, repository, contentsChanged } =
      await selecting();
    repository.failWith.deleteManyWithCount = new Error('offline');
    rowBody(0)?.click();
    rowBody(1)?.click();
    await update();

    button('Eliminar')?.click();
    await update();
    dialogButton('Borrar 2')?.click();
    await update();

    expect(openDialog().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudieron borrar las tarjetas seleccionadas. Inténtalo de nuevo.',
    );
    expect(rows()).toHaveLength(5);
    expect(counter()).toBe('2 seleccionadas');
    expect(contentsChanged).not.toHaveBeenCalled();
  });

  it('cortado a mitad, reintentar pide solo las que faltan', async () => {
    const { rowBody, button, update, repository } = await selecting();
    const deleteMany = vi.spyOn(repository, 'deleteManyWithCount');
    rowBody(0)?.click();
    rowBody(1)?.click();
    await update();
    button('Eliminar')?.click();
    await update();

    repository.failWith.deleteManyWithCount = new PartialDeletionError(['k3'], new Error('red'));
    dialogButton('Borrar 2')?.click();
    await update();
    delete repository.failWith.deleteManyWithCount;
    dialogButton('Borrar 2')?.click();
    await update();

    expect(deleteMany.mock.calls.map((call) => call[2])).toEqual([['k3', 'k2'], ['k2']]);
  });
});
