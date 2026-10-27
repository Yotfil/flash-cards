import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { Card } from '@domain/models/card.model';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { CardsService } from '@services/cards/cards.service';
import { SessionService } from '@services/session/session.service';
import { DialogService } from '@shared/dialog/dialog.service';
import {
  allowDialogFocusInJsdom,
  dialogButton,
  openDialog,
  pressEscape,
  typeInto,
} from '@testing/dialog-test-helpers';
import { FakeBookRepository } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { CardFormDialogComponent, type CardFormDialogData } from './card-form-dialog.component';

const EXISTING = aCard({ id: 'k1', chapterId: 'c1', front: 'to give up', back: 'rendirse' });

async function setup(data?: CardFormDialogData, online = true) {
  const repository = new FakeCardRepository();
  repository.seed(EXISTING);
  const connectivity = new FakeConnectivity(online);
  TestBed.configureTestingModule({
    providers: [
      { provide: CardRepository, useValue: repository },
      { provide: BookRepository, useValue: new FakeBookRepository() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
      { provide: ConnectivityPort, useValue: connectivity },
      { provide: Logger, useValue: new FakeLogger() },
    ],
  });
  const update = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  TestBed.inject(CardsService).openChapter('c1');
  await update();
  const ref = TestBed.inject(DialogService).open<Card, CardFormDialogData>(
    CardFormDialogComponent,
    {
      label: 'Tarjeta',
      size: 'lg',
      data: data ?? {
        mode: 'create',
        bookId: 'b1',
        chapterId: 'c1',
        chapterCards: signal([EXISTING]),
      },
    },
  );
  await update();
  const submit = () => openDialog().querySelector('form')?.dispatchEvent(new Event('submit'));
  const field = (selector: string) => openDialog().querySelector<HTMLTextAreaElement>(selector);
  const chooseType = (label: string) => {
    const radio = Array.from(
      openDialog().querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    ).find((candidate) => candidate.closest('label')?.textContent?.trim() === label);
    radio?.click();
  };
  return { ref, repository, connectivity, update, submit, field, chooseType };
}

describe('CardFormDialogComponent · crear', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  it('"Nueva tarjeta" con el tipo Básica elegido por defecto', async () => {
    await setup();

    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Nueva tarjeta');
    const radios = Array.from(
      openDialog().querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    );
    expect(radios.map((radio) => radio.closest('label')?.textContent?.trim())).toEqual([
      'Básica',
      'Cloze (rellenar el hueco)',
    ]);
    expect(radios[0]?.checked).toBe(true);
  });

  it('anverso y reverso de solo espacios bloquean y explican su error al tocarlos', async () => {
    const { update } = await setup();

    typeInto('#card-front', '   ').dispatchEvent(new Event('blur'));
    typeInto('#card-back', '   ').dispatchEvent(new Event('blur'));
    await update();

    expect(dialogButton('Crear tarjeta')?.disabled).toBe(true);
    expect(openDialog().textContent).toContain('El anverso es obligatorio.');
    expect(openDialog().textContent).toContain('El reverso es obligatorio.');
  });

  it('cloze pide un texto con huecos sin reverso; volver a Básica reactiva el reverso', async () => {
    const { update, chooseType, field } = await setup();

    chooseType('Cloze (rellenar el hueco)');
    await update();
    expect(openDialog().querySelector('label[for="card-front"]')?.textContent?.trim()).toBe(
      'Texto con huecos',
    );
    expect(field('#card-back')).toBeNull();
    typeInto('#card-front', 'El gato es negro');
    await update();
    expect(dialogButton('Crear tarjeta')?.disabled).toBe(true);
    typeInto('#card-front', 'El {{gato}} es negro');
    await update();
    expect(dialogButton('Crear tarjeta')?.disabled).toBe(false);

    chooseType('Básica');
    await update();
    expect(field('#card-back')).not.toBeNull();
    expect(dialogButton('Crear tarjeta')?.disabled).toBe(true);
  });

  it('"Más opciones" está plegado y despliega el ejemplo', async () => {
    const { update, field } = await setup();
    const toggle = dialogButton('Más opciones');

    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(field('#card-example')).toBeNull();
    toggle?.click();
    await update();

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(field('#card-example')).not.toBeNull();
  });

  it('avisa si ya hay una igual en el capítulo, sin impedir guardar', async () => {
    const { update } = await setup();

    typeInto('#card-front', 'To Give Up');
    typeInto('#card-back', ' rendirse');
    await update();

    expect(openDialog().querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Ya tienes una tarjeta igual en este capítulo.',
    );
    expect(dialogButton('Crear tarjeta')?.disabled).toBe(false);
  });

  it('Cancelar y Escape cierran sin resultado', async () => {
    const first = await setup();
    dialogButton('Cancelar')?.click();
    await expect(first.ref.closed).resolves.toBeUndefined();

    const second = TestBed.inject(DialogService).open<Card, CardFormDialogData>(
      CardFormDialogComponent,
      {
        label: 'Tarjeta',
        data: { mode: 'create', bookId: 'b1', chapterId: 'c1', chapterCards: signal([]) },
      },
    );
    await first.update();
    pressEscape();
    await expect(second.closed).resolves.toBeUndefined();
  });

  it('mientras guarda: "Guardando…", bloqueado y un solo alta con dos envíos', async () => {
    const { ref, repository, update, submit } = await setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const create = repository.create.bind(repository);
    repository.create = async (...args) => {
      await gate;
      return create(...args);
    };
    typeInto('#card-front', 'hola');
    typeInto('#card-back', 'hello');
    await update();

    submit();
    submit();
    await update();
    expect(dialogButton('Guardando…')?.disabled).toBe(true);
    expect(dialogButton('Cancelar')?.disabled).toBe(true);
    pressEscape();
    expect(ref.isPending).toBe(true);

    release();
    await expect(ref.closed).resolves.toMatchObject({ front: 'hola', back: 'hello' });
    expect(repository.calls.create).toBe(1);
  });

  it('en un capítulo, si no confirma en 6 s, avisa que quedó guardado en el dispositivo y deja cerrar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { ref, repository, update, submit } = await setup();
    repository.create = () => new Promise<Card>(() => undefined);
    typeInto('#card-front', 'hola');
    typeInto('#card-back', 'hello');
    await update();
    submit();
    await update();
    vi.advanceTimersByTime(6000);
    await update();

    expect(openDialog().querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Quedó guardado en este dispositivo; se enviará cuando vuelva la red.',
    );
    expect(dialogButton('Guardando…')?.disabled).toBe(true);
    expect(dialogButton('Cerrar')?.disabled).toBe(false);
    dialogButton('Cerrar')?.click();
    await expect(ref.closed).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('con un guardado propio (un paquete), no promete nada: sigue ocupado pasados 6 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { update, submit } = await setup({
      mode: 'create',
      save: () => new Promise<void>(() => undefined),
      existing: { cards: signal([]), message: 'Ya está en el paquete.' },
    });
    typeInto('#card-front', 'hola');
    typeInto('#card-back', 'hello');
    await update();
    submit();
    await update();
    vi.advanceTimersByTime(6000);
    await update();

    expect(openDialog().textContent).not.toContain(
      'Quedó guardado en este dispositivo; se enviará cuando vuelva la red.',
    );
    expect(dialogButton('Cancelar')?.disabled).toBe(true);
    expect(dialogButton('Cerrar')).toBeUndefined();
    vi.useRealTimers();
  });

  it('si falla sigue abierto con el texto y el error; el reintento cierra con la tarjeta', async () => {
    const { ref, repository, update, submit, field } = await setup();
    repository.failWith.create = new Error('offline');
    typeInto('#card-front', 'hola');
    typeInto('#card-back', 'hello');
    await update();

    submit();
    await update();
    expect(openDialog().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo guardar la tarjeta. Inténtalo de nuevo.',
    );
    expect(field('#card-front')?.value).toBe('hola');

    delete repository.failWith.create;
    submit();
    await expect(ref.closed).resolves.toMatchObject({ front: 'hola' });
  });

  it('sin red no deja crear y lo explica; al volver la red se habilita con el texto', async () => {
    const { connectivity, update, field } = await setup(undefined, false);
    typeInto('#card-front', 'hola');
    typeInto('#card-back', 'hello');
    await update();

    expect(dialogButton('Crear tarjeta')?.disabled).toBe(true);
    expect(openDialog().textContent).toContain('Necesitas conexión para guardar cambios.');

    connectivity.setOnline(true);
    await update();
    expect(dialogButton('Crear tarjeta')?.disabled).toBe(false);
    expect(field('#card-front')?.value).toBe('hola');
  });
});

describe('CardFormDialogComponent · editar', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  it('"Editar tarjeta" sin selector de tipo, con la cloze precargada y sin aviso de repetida', async () => {
    const cloze = aCard({
      id: 'k1',
      chapterId: 'c1',
      cardType: 'cloze',
      front: 'El {{gato}}',
      back: '',
    });
    const { field } = await setup({ mode: 'edit', card: cloze });

    expect(openDialog().querySelector('h2')?.textContent?.trim()).toBe('Editar tarjeta');
    expect(dialogButton('Guardar')).toBeDefined();
    expect(openDialog().querySelectorAll('input[type="radio"]')).toHaveLength(0);
    expect(field('#card-front')?.value).toBe('El {{gato}}');
    expect(openDialog().querySelector('[role="status"]')).toBeNull();
  });

  it('con ejemplo, "Más opciones" aparece desplegado; guardar cierra con la tarjeta editada', async () => {
    const { ref, field, update, submit } = await setup({
      mode: 'edit',
      card: aCard({ ...EXISTING, example: 'I give up.' }),
    });

    expect(dialogButton('Más opciones')?.getAttribute('aria-expanded')).toBe('true');
    expect(field('#card-example')?.value).toBe('I give up.');
    typeInto('#card-back', 'abandonar');
    await update();
    submit();

    await expect(ref.closed).resolves.toMatchObject({ id: 'k1', back: 'abandonar' });
  });
});

describe('CardFormDialogComponent · con su propio guardado (un paquete)', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  const ITEM = {
    id: 'i1',
    cardType: 'basic' as const,
    front: 'to call it a day',
    back: 'dar el día por terminado',
  };

  it('crear llama a su save con el borrador, sin tocar las tarjetas, y avisa de repetidas contra su lista', async () => {
    const save = vi.fn(async () => undefined);
    const { ref, repository, update, submit } = await setup({
      mode: 'create',
      save,
      existing: { cards: signal([ITEM]), message: 'Ya tienes un ítem igual en este paquete.' },
    });

    typeInto('#card-front', 'To call it a day');
    typeInto('#card-back', 'dar el día por terminado');
    await update();
    expect(openDialog().querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Ya tienes un ítem igual en este paquete.',
    );
    submit();
    await update();

    expect(save).toHaveBeenCalledWith({
      cardType: 'basic',
      front: 'To call it a day',
      back: 'dar el día por terminado',
      example: '',
    });
    expect(repository.calls.create + repository.calls.createMany).toBe(0);
    await expect(ref.closed).resolves.toBeUndefined();
  });

  it('editar precarga la cara y guarda con su save', async () => {
    const save = vi.fn(async () => undefined);
    const { repository, update, submit } = await setup({ mode: 'edit', card: ITEM, save });

    expect(openDialog().querySelector<HTMLTextAreaElement>('#card-front')?.value).toBe(
      'to call it a day',
    );
    typeInto('#card-back', 'terminar por hoy');
    await update();
    submit();
    await update();

    expect(save).toHaveBeenCalledWith(expect.objectContaining({ back: 'terminar por hoy' }));
    expect(repository.contentChanges).toEqual([]);
  });
});
