import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { PracticePackage } from '@domain/models/practice-package';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { FileDeliveryPort } from '@domain/ports/file-delivery.port';
import { ImportRepository } from '@domain/ports/import.repository';
import { Logger } from '@domain/ports/logger.port';
import { PracticePackageRepository } from '@domain/ports/practice-package.repository';
import { PracticeAiHandoffService } from '@services/practice-ai/practice-ai-handoff.service';
import { SessionService } from '@services/session/session.service';
import { allowDialogFocusInJsdom, typeInto } from '@testing/dialog-test-helpers';
import { FakeBookRepository } from '@testing/fake-book-repository';
import { FakeCardRepository } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeFileDelivery } from '@testing/fake-file-delivery';
import { FakeImportRepository } from '@testing/fake-import-repository';
import { FakeLogger } from '@testing/fake-logger';
import {
  FakePracticePackageRepository,
  aPackage,
  anItem,
} from '@testing/fake-practice-package-repository';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { PackageDetailPageComponent } from './package-detail-page.component';

@Component({ template: '' })
class BlankPageComponent {}

// Sábado 25 de octubre de 2026, 10:00 en Bogotá (día de estudio 2026-10-25).
const T0 = new Date('2026-10-25T15:00:00Z');
const TODAY = '2026-10-25';

const NEW = anItem({ id: 'n1', front: 'to call it a day', back: 'dar el día por terminado' });
const RESTED = anItem({
  id: 'g1',
  front: 'to put off',
  back: 'posponer',
  lastGrade: 3,
  lastPracticedDayId: '2026-10-24',
});
const FILM = aPackage({ id: 'p1', name: 'Película del viernes' }, [NEW, RESTED]);

async function open(options: { packages?: PracticePackage[]; id?: string; online?: boolean } = {}) {
  const repository = new FakePracticePackageRepository();
  repository.seed(...(options.packages ?? [FILM]));
  const connectivity = new FakeConnectivity(options.online ?? true);
  const delivery = new FakeFileDelivery();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'paquetes/:id', component: PackageDetailPageComponent },
        { path: 'practica-ia', component: BlankPageComponent },
        { path: 'biblioteca', component: BlankPageComponent },
      ]),
      { provide: PracticePackageRepository, useValue: repository },
      { provide: CardRepository, useValue: new FakeCardRepository() },
      { provide: BookRepository, useValue: new FakeBookRepository() },
      { provide: ImportRepository, useValue: new FakeImportRepository() },
      { provide: ConnectivityPort, useValue: connectivity },
      { provide: FileDeliveryPort, useValue: delivery },
      { provide: Logger, useValue: new FakeLogger() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/paquetes/${options.id ?? 'p1'}`);
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
  const dialogs = () =>
    Array.from(document.querySelectorAll<HTMLElement>('.cdk-overlay-container [role="dialog"]'));
  const dialogButton = (text: string) =>
    Array.from(dialogs().at(-1)?.querySelectorAll('button') ?? []).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  const chooseMenu = async (label: string, item: string) => {
    page().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)?.click();
    await update();
    Array.from(document.querySelectorAll<HTMLElement>('.cdk-overlay-container [role="menuitem"]'))
      .find((candidate) => candidate.textContent?.trim() === item)
      ?.click();
    await update();
  };
  const rows = () =>
    Array.from(page().querySelectorAll('[data-item-row]')).map((row) =>
      ['[data-item-text]', '[data-item-status]']
        .map((part) => row.querySelector(part)?.textContent?.replace(/\s+/g, ' ').trim())
        .join(' · '),
    );
  return {
    harness,
    repository,
    connectivity,
    delivery,
    update,
    page,
    button,
    dialogs,
    dialogButton,
    chooseMenu,
    rows,
    url: () => TestBed.inject(Router).url,
  };
}

describe('PackageDetailPageComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
    allowDialogFocusInJsdom();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('cabecera con el nombre e "ítems / capacidad", y los ítems con "Para hoy" o su última nota', async () => {
    const { page, rows } = await open();

    expect(page().querySelector('h1')?.textContent?.trim()).toBe('Película del viernes');
    expect(page().querySelector('[data-items-count]')?.textContent?.trim()).toBe('2 / 20');
    expect(page().querySelector('a[href="/biblioteca"]')).not.toBeNull();
    expect(rows()).toEqual([
      'to call it a day → dar el día por terminado · Para hoy',
      'to put off → posponer · Bien · ayer',
    ]);
  });

  it('"Practicar hoy" prepara la práctica del día y la abre; sin nada para hoy, lo dice', async () => {
    const opened = await open();

    opened.button('Practicar hoy')?.click();
    await opened.update();

    expect(
      TestBed.inject(PracticeAiHandoffService)
        .prepared()
        ?.items.map((item) => item.id),
    ).toEqual(['n1']);
    expect(opened.url()).toBe('/practica-ia');
    TestBed.resetTestingModule();

    const rested = await open({ packages: [aPackage({ id: 'p1' }, [RESTED])] });
    rested.button('Practicar hoy')?.click();
    await rested.update();
    expect(rested.page().textContent).toContain('Nada para hoy.');
  });

  it('"Agregar" usa el formulario de tarjeta y el ítem aparece en la lista', async () => {
    const { button, update, dialogs, repository, rows } = await open();

    button('Agregar')?.click();
    await update();
    typeInto('#card-front', 'to look up');
    typeInto('#card-back', 'buscar');
    await update();
    dialogs().at(-1)?.querySelector('form')?.dispatchEvent(new Event('submit'));
    await update();

    expect(repository.calls.addItems).toBe(1);
    expect(rows()).toContain('to look up → buscar · Para hoy');
  });

  it('si otro dispositivo ya lo completó, agregar lo dice en el formulario y no agrega', async () => {
    const { button, update, dialogs, repository } = await open();
    repository.seed({
      ...FILM,
      status: 'completed',
      completedAt: new Date('2026-10-26T12:00:00Z'),
    });

    button('Agregar')?.click();
    await update();
    typeInto('#card-front', 'to look up');
    typeInto('#card-back', 'buscar');
    await update();
    dialogs().at(-1)?.querySelector('form')?.dispatchEvent(new Event('submit'));
    await update();

    expect(dialogs().at(-1)?.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Este paquete ya está completado; no admite más ítems.',
    );
  });

  it('si otro dispositivo ya lo completó, importar lo dice en el diálogo', async () => {
    const { button, update, dialogs, repository } = await open();
    repository.seed({
      ...FILM,
      status: 'completed',
      completedAt: new Date('2026-10-26T12:00:00Z'),
    });

    button('Importar')?.click();
    await update();
    const dialog = dialogs().at(-1);
    const area = dialog?.querySelector('textarea') as HTMLTextAreaElement;
    area.value = 'a | b';
    area.dispatchEvent(new Event('input'));
    await update();
    Array.from(dialog?.querySelectorAll('button') ?? [])
      .find((candidate) => candidate.textContent?.trim().startsWith('Importar 1'))
      ?.click();
    await update();

    expect(dialog?.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Este paquete ya está completado; no admite más ítems.',
    );
  });

  it('"Importar" abre el diálogo de pegar texto del paquete, con lo que cabe', async () => {
    const { button, update, dialogs } = await open({
      packages: [aPackage({ id: 'p1', capacity: 3 }, [NEW, RESTED])],
    });

    button('Importar')?.click();
    await update();
    const dialog = dialogs().at(-1);
    const area = dialog?.querySelector('textarea') as HTMLTextAreaElement;
    area.value = 'a | b\nc | d';
    area.dispatchEvent(new Event('input'));
    await update();

    expect(dialog?.querySelector('h2')?.textContent?.trim()).toBe('Importar ítems');
    expect(dialog?.textContent).toContain('Cabe 1 más en este paquete.');
    expect(dialog?.textContent).toContain('Importar 1');
  });

  it('lleno: "Agregar" e "Importar" deshabilitados con "Este paquete está lleno."', async () => {
    const full = Array.from({ length: 20 }, (_, index) => anItem({ id: `i${index}` }));
    const { button, page } = await open({ packages: [aPackage({ id: 'p1' }, full)] });

    expect(button('Agregar')?.disabled).toBe(true);
    expect(button('Importar')?.disabled).toBe(true);
    expect(page().textContent).toContain('Este paquete está lleno.');
  });

  it('"Copiar prompt de hoy" pide practicar primero; practicado hoy, copia', async () => {
    const before = await open();
    expect(before.button('Copiar prompt de hoy')?.disabled).toBe(true);
    expect(before.page().textContent).toContain('Practica primero para armar el prompt de hoy.');
    TestBed.resetTestingModule();

    const practiced = aPackage({ id: 'p1', todaySet: { dayId: TODAY, itemIds: ['n1'] } }, [
      { ...NEW, lastGrade: 1, lastPracticedDayId: TODAY },
    ]);
    const after = await open({ packages: [practiced] });
    after.button('Copiar prompt de hoy')?.click();
    await after.update();

    expect(after.delivery.copied[0]).toContain('to call it a day | dar el día por terminado');
  });

  it('"Marcar como completado" confirma y lo pasa al historial; cancelar no cambia nada', async () => {
    const { button, update, dialogs, dialogButton, repository, page } = await open();

    button('Marcar como completado')?.click();
    await update();
    expect(dialogs().at(-1)?.textContent).toContain(
      '¿Ya te sabes todos los ítems de este paquete? Pasará al historial y dejará de practicarse.',
    );
    dialogButton('Cancelar')?.click();
    await update();
    expect(repository.calls.complete).toBe(0);

    button('Marcar como completado')?.click();
    await update();
    dialogButton('Marcar como completado')?.click();
    await update();

    expect(repository.packages.get('p1')?.status).toBe('completed');
    expect(button('Practicar hoy')).toBeUndefined();
    expect(page().textContent).toContain('Completado el');
  });

  it('completado: solo lectura y "Copiar prompt" con todos sus ítems', async () => {
    const done = aPackage({ id: 'p1', status: 'completed', completedAt: T0 }, [NEW, RESTED]);
    const { button, page, update, delivery } = await open({ packages: [done] });

    expect(button('Practicar hoy')).toBeUndefined();
    expect(button('Agregar')).toBeUndefined();
    expect(button('Importar')).toBeUndefined();
    expect(button('Marcar como completado')).toBeUndefined();
    expect(page().querySelector('[data-item-row] app-action-menu')).toBeNull();
    button('Copiar prompt')?.click();
    await update();

    expect(delivery.copied[0]).toContain('to call it a day | dar el día por terminado');
    expect(delivery.copied[0]).toContain('to put off | posponer');
  });

  it('sin red: la gestión se deshabilita con el motivo; practicar y copiar siguen', async () => {
    const practiced = aPackage({ id: 'p1', todaySet: { dayId: TODAY, itemIds: ['n1'] } }, [NEW]);
    const { button, page } = await open({ packages: [practiced], online: false });

    expect(button('Agregar')?.disabled).toBe(true);
    expect(button('Importar')?.disabled).toBe(true);
    expect(button('Marcar como completado')?.disabled).toBe(true);
    expect(
      page().querySelector('button[aria-label="Acciones de «Película del viernes»"]'),
    ).toHaveProperty('disabled', true);
    expect(page().textContent).toContain('Necesitas conexión para guardar cambios.');
    expect(button('Practicar hoy')?.disabled).toBe(false);
    expect(button('Copiar prompt de hoy')?.disabled).toBe(false);
  });

  it('el menú renombra y borra (con la confirmación que nombra los ítems) y vuelve a la Biblioteca', async () => {
    const { chooseMenu, dialogs, update, repository, url } = await open();

    await chooseMenu('Acciones de «Película del viernes»', 'Renombrar');
    expect(dialogs().at(-1)?.querySelector('h2')?.textContent?.trim()).toBe('Renombrar paquete');
    dialogs()
      .at(-1)
      ?.querySelectorAll('button')
      .forEach((candidate) => candidate.textContent?.trim() === 'Cancelar' && candidate.click());
    await update();

    await chooseMenu('Acciones de «Película del viernes»', 'Borrar');
    const confirm = dialogs().at(-1);
    expect(confirm?.textContent).toContain('¿Borrar este paquete?');
    expect(confirm?.textContent).toContain('Se pierden sus 2 ítems. No se puede deshacer.');
    Array.from(confirm?.querySelectorAll('button') ?? [])
      .find((candidate) => candidate.textContent?.trim() === 'Borrar')
      ?.click();
    await update();

    expect(repository.packages.has('p1')).toBe(false);
    expect(url()).toBe('/biblioteca');
  });

  it('un id inexistente dice "Paquete no encontrado"', async () => {
    const { page } = await open({ id: 'nadie' });

    expect(page().textContent).toContain('Paquete no encontrado');
  });
});
