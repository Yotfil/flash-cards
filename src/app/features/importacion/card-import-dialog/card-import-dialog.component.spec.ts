import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { Card } from '@domain/models/card.model';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { ImportRepository } from '@domain/ports/import.repository';
import { Logger } from '@domain/ports/logger.port';
import { CardsService } from '@services/cards/cards.service';
import { ImportService } from '@services/import/import.service';
import { SessionService } from '@services/session/session.service';
import { DialogService } from '@shared/dialog/dialog.service';
import { allowDialogFocusInJsdom, pressEscape } from '@testing/dialog-test-helpers';
import { FakeBookRepository } from '@testing/fake-book-repository';
import { FakeCardRepository, aCard } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeImportRepository } from '@testing/fake-import-repository';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import {
  CardImportDialogComponent,
  type CardImportDialogData,
  type PackageImportTarget,
} from './card-import-dialog.component';

const FIVE = Array.from({ length: 5 }, (_, index) =>
  aCard({
    id: `k${index}`,
    chapterId: 'c1',
    front: index === 0 ? 'to give up' : `f${index}`,
    back: index === 0 ? 'rendirse' : 'x',
  }),
);

async function open(
  options: { cards?: Card[]; online?: boolean; packageTarget?: PackageImportTarget } = {},
) {
  const repository = new FakeCardRepository();
  const existing = options.cards ?? FIVE;
  repository.seed(...existing);
  const connectivity = new FakeConnectivity(options.online ?? true);
  TestBed.configureTestingModule({
    providers: [
      { provide: CardRepository, useValue: repository },
      { provide: BookRepository, useValue: new FakeBookRepository() },
      { provide: ImportRepository, useValue: new FakeImportRepository() },
      { provide: ConnectivityPort, useValue: connectivity },
      { provide: Logger, useValue: new FakeLogger() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
    ],
  });
  const update = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  TestBed.inject(CardsService).openChapter('c1');
  await update();
  const ref = TestBed.inject(DialogService).open<boolean, CardImportDialogData>(
    CardImportDialogComponent,
    {
      label: 'Importar tarjetas',
      size: 'lg',
      data: {
        target: options.packageTarget ?? {
          kind: 'chapter',
          bookId: 'b1',
          chapterId: 'c1',
          chapterName: 'Básicos',
          chapterCards: signal(existing),
        },
      },
    },
  );
  await update();
  const dialogs = () =>
    Array.from(document.querySelectorAll<HTMLElement>('.cdk-overlay-container [role="dialog"]'));
  const importDialog = () => dialogs()[0] as HTMLElement;
  const confirmDialog = () => (dialogs().length > 1 ? dialogs().at(-1) : undefined);
  const buttonIn = (scope: HTMLElement | undefined, predicate: (text: string) => boolean) =>
    Array.from(scope?.querySelectorAll('button') ?? []).find((button) =>
      predicate(button.textContent?.trim() ?? ''),
    );
  const importButton = () =>
    buttonIn(importDialog(), (text) => text.startsWith('Importar') || text === 'Importando…');
  const type = async (value: string) => {
    const area = importDialog().querySelector<HTMLTextAreaElement>('textarea');
    if (area) {
      area.value = value;
      area.dispatchEvent(new Event('input'));
    }
    await update();
  };
  const chooseReplace = async () => {
    Array.from(importDialog().querySelectorAll<HTMLInputElement>('input[type="radio"]'))
      .find((radio) => radio.closest('label')?.textContent?.trim() === 'Reemplazar todas')
      ?.click();
    await update();
  };
  const service = TestBed.inject(ImportService);
  return {
    ref,
    repository,
    connectivity,
    update,
    importDialog,
    confirmDialog,
    buttonIn,
    importButton,
    type,
    chooseReplace,
    service,
  };
}

describe('CardImportDialogComponent', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  it('pregunta qué hacer con las existentes ("Agregar" por defecto) y previsualiza contra ellas', async () => {
    const { importDialog, type } = await open();

    expect(importDialog().textContent).toContain(
      '¿Qué hacemos con las tarjetas que ya tiene el capítulo?',
    );
    const radios = Array.from(
      importDialog().querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    );
    expect(radios.map((radio) => radio.closest('label')?.textContent?.trim())).toEqual([
      'Agregar a las que ya existen',
      'Reemplazar todas',
    ]);
    expect(radios[0]?.checked).toBe(true);
    expect(importDialog().querySelector('textarea')?.getAttribute('placeholder')).toContain(' :: ');

    await type('to give up | rendirse\nx | y');

    expect(importDialog().textContent).toContain('2 tarjetas · 1 repetida');
    expect(importDialog().textContent).not.toContain('capítulo ·');
  });

  it('agregar importa directo, con el ejemplo, y cierra con true', async () => {
    const { ref, service, type, importButton, confirmDialog } = await open();
    const importInto = vi.spyOn(service, 'importIntoChapter');
    await type('a | b :: ejemplo');

    importButton()?.click();

    await expect(ref.closed).resolves.toBe(true);
    expect(confirmDialog()).toBeUndefined();
    expect(importInto).toHaveBeenCalledWith(
      'b1',
      'c1',
      [{ cardType: 'basic', front: 'a', back: 'b', example: 'ejemplo' }],
      'append',
    );
  });

  it('reemplazar en un capítulo con tarjetas pide confirmación antes de escribir', async () => {
    const {
      service,
      type,
      chooseReplace,
      importButton,
      confirmDialog,
      buttonIn,
      update,
      importDialog,
    } = await open();
    const importInto = vi.spyOn(service, 'importIntoChapter');
    await type('a | b');
    await chooseReplace();

    importButton()?.click();
    await update();

    expect(confirmDialog()?.textContent).toContain('¿Reemplazar todas las tarjetas?');
    expect(confirmDialog()?.textContent).toContain('Se borrarán las 5 tarjetas actuales');
    expect(buttonIn(confirmDialog(), (text) => text === 'Reemplazar todo')).toBeDefined();
    expect(importInto).not.toHaveBeenCalled();

    buttonIn(confirmDialog(), (text) => text === 'Cancelar')?.click();
    await update();
    expect(confirmDialog()).toBeUndefined();
    expect(importDialog().querySelector('textarea')?.value).toBe('a | b');
    expect(importInto).not.toHaveBeenCalled();
  });

  it('confirmar el reemplazo escribe y cierra con true', async () => {
    const { ref, service, type, chooseReplace, importButton, confirmDialog, buttonIn, update } =
      await open();
    const importInto = vi.spyOn(service, 'importIntoChapter');
    await type('a | b');
    await chooseReplace();
    importButton()?.click();
    await update();

    buttonIn(confirmDialog(), (text) => text === 'Reemplazar todo')?.click();

    await expect(ref.closed).resolves.toBe(true);
    expect(importInto).toHaveBeenCalledWith('b1', 'c1', expect.any(Array), 'replace');
  });

  it('en un capítulo vacío, reemplazar va directo', async () => {
    const { ref, type, chooseReplace, importButton, confirmDialog } = await open({ cards: [] });
    await type('a | b');
    await chooseReplace();

    importButton()?.click();

    await expect(ref.closed).resolves.toBe(true);
    expect(confirmDialog()).toBeUndefined();
  });

  it('mientras importa: "Importando…", todo bloqueado y un solo envío', async () => {
    const { ref, repository, type, importButton, buttonIn, importDialog, update } = await open();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const createMany = repository.createMany.bind(repository);
    const calls = vi.spyOn(repository, 'createMany').mockImplementation(async (...args) => {
      await gate;
      return createMany(...args);
    });
    await type('a | b');

    importButton()?.click();
    importButton()?.click();
    await update();

    expect(importButton()?.textContent?.trim()).toBe('Importando…');
    expect(importButton()?.disabled).toBe(true);
    expect(buttonIn(importDialog(), (text) => text === 'Cancelar')?.disabled).toBe(true);
    pressEscape();
    expect(ref.isPending).toBe(true);
    release();
    await expect(ref.closed).resolves.toBe(true);
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it('si agregar falla, avisa dentro, conserva el texto y deja cancelar', async () => {
    const { repository, type, importButton, importDialog, buttonIn, update } = await open();
    repository.failWith.createMany = new Error('offline');
    await type('a | b');

    importButton()?.click();
    await update();

    expect(importDialog().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudieron importar las tarjetas. Inténtalo de nuevo.',
    );
    expect(importDialog().querySelector('textarea')?.value).toBe('a | b');
    expect(buttonIn(importDialog(), (text) => text === 'Cancelar')?.disabled).toBe(false);
  });

  it('sin red previsualiza pero no deja importar; cancelar no escribe', async () => {
    const { ref, service, type, importButton, importDialog, buttonIn } = await open({
      online: false,
    });
    const importInto = vi.spyOn(service, 'importIntoChapter');
    await type('a | b\nc | d');

    expect(importDialog().textContent).toContain('2 tarjetas');
    expect(importButton()?.disabled).toBe(true);
    expect(importDialog().textContent).toContain('Necesitas conexión para guardar cambios.');

    buttonIn(importDialog(), (text) => text === 'Cancelar')?.click();
    await expect(ref.closed).resolves.toBeUndefined();
    expect(importInto).not.toHaveBeenCalled();
  });
});

describe('CardImportDialogComponent · en un paquete', () => {
  beforeEach(() => allowDialogFocusInJsdom());
  afterEach(() => vi.restoreAllMocks());

  function packageTarget(save: PackageImportTarget['save']): PackageImportTarget {
    return {
      kind: 'package',
      packageName: 'Película del viernes',
      existing: signal([{ id: 'i1', cardType: 'basic', front: 'to give up', back: 'rendirse' }]),
      remaining: 2,
      save,
      texts: {
        title: 'Importar ítems',
        remaining: 'Caben 2 más en este paquete.',
        error: 'No se pudieron agregar los ítems. Inténtalo de nuevo.',
        wording: {
          one: 'ítem',
          many: 'ítems',
          repeatedOne: 'repetido',
          repeatedMany: 'repetidos',
          repeatedNote: 'Se agregarán igual.',
        },
      },
    };
  }

  it('solo agrega: sin modos; cuenta repetidas contra el paquete y limita a lo que cabe', async () => {
    const save = vi.fn(async () => undefined);
    const { ref, repository, importDialog, importButton, type } = await open({
      packageTarget: packageTarget(save),
    });

    expect(importDialog().querySelector('h2')?.textContent?.trim()).toBe('Importar ítems');
    expect(importDialog().querySelector('input[type="radio"]')).toBeNull();
    await type('# Escena 1\nto give up | rendirse\na | b\nc | d\ne | f\ng | h');

    expect(importDialog().textContent).toContain('5 ítems · 1 repetido');
    expect(importDialog().textContent).toContain('Caben 2 más en este paquete.');
    expect(importButton()?.textContent?.trim()).toBe('Importar 2');
    importButton()?.click();

    await expect(ref.closed).resolves.toBe(true);
    expect(save).toHaveBeenCalledWith([
      { cardType: 'basic', front: 'to give up', back: 'rendirse' },
      { cardType: 'basic', front: 'a', back: 'b' },
    ]);
    expect(repository.calls.createMany).toBe(0);
  });

  it('si guardar falla, avisa con su texto y conserva lo pegado', async () => {
    const save = vi.fn(async () => {
      throw new Error('offline');
    });
    const { importDialog, importButton, type, update } = await open({
      packageTarget: packageTarget(save),
    });
    await type('a | b');

    importButton()?.click();
    await update();

    expect(importDialog().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudieron agregar los ítems. Inténtalo de nuevo.',
    );
    expect(importDialog().querySelector('textarea')?.value).toBe('a | b');
  });
});
