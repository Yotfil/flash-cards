import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { ImportBookError, ImportRepository } from '@domain/ports/import.repository';
import { Logger } from '@domain/ports/logger.port';
import { SessionService } from '@services/session/session.service';
import { FakeBookRepository } from '@testing/fake-book-repository';
import { FakeCardRepository } from '@testing/fake-card-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeImportRepository } from '@testing/fake-import-repository';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { ImportarLibroPageComponent } from './importar-libro-page.component';

@Component({ template: '' })
class BlankPageComponent {}

const VALID = ['# Uno', 'a | b', 'c | d', 'sin separador', 'e | f', 'g | h'].join('\n');

async function open(online = true) {
  const imports = new FakeImportRepository();
  const connectivity = new FakeConnectivity(online);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'importar', component: ImportarLibroPageComponent },
        { path: 'biblioteca/:bookId', component: BlankPageComponent },
        { path: 'hoy', component: BlankPageComponent },
      ]),
      { provide: ImportRepository, useValue: imports },
      { provide: BookRepository, useValue: new FakeBookRepository() },
      { provide: CardRepository, useValue: new FakeCardRepository() },
      { provide: ConnectivityPort, useValue: connectivity },
      { provide: Logger, useValue: new FakeLogger() },
      {
        provide: SessionService,
        useValue: new FakeSessionService({ kind: 'active', user: aUser() }),
      },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/importar');
  const update = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    harness.detectChanges();
  };
  const page = () => harness.routeNativeElement as HTMLElement;
  const input = <T extends HTMLElement = HTMLInputElement>(selector: string) =>
    page().querySelector<T>(selector) as T;
  const type = async (selector: string, value: string) => {
    const field = input<HTMLInputElement | HTMLTextAreaElement>(selector);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await update();
  };
  const button = (predicate: (text: string) => boolean) =>
    Array.from(page().querySelectorAll('button')).find((candidate) =>
      predicate(candidate.textContent?.trim() ?? ''),
    );
  const importButton = () =>
    button((text) => text.startsWith('Importar') || text === 'Importando…');
  const loadFile = async (name: string, content: string) => {
    const fileInput = input('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [new File([content], name, { type: 'text/plain' })],
      configurable: true,
    });
    fileInput.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    await update();
  };
  await update();
  return { harness, imports, connectivity, page, input, type, update, importButton, loadFile };
}

describe('ImportarLibroPageComponent', () => {
  it('pide nombre, materia (con su pista) y el texto, y previsualiza en vivo', async () => {
    const { page, input, type, importButton } = await open();

    expect(input('#import-name')).not.toBeNull();
    expect(page().textContent).toContain('Si la dejas vacía, será «general»');
    expect(importButton()?.textContent?.trim()).toBe('Importar 0');
    expect(importButton()?.disabled).toBe(true);

    await type('#import-text', VALID);

    expect(page().textContent).toContain('1 capítulo · 4 tarjetas');
    expect(page().textContent).toContain('1 línea se omitirá:');
    expect(importButton()?.textContent?.trim()).toBe('Importar 4');
    expect(importButton()?.disabled).toBe(false);
  });

  it('cargar un archivo rellena el texto y propone el nombre; un nombre editado se respeta', async () => {
    const { input, type, loadFile } = await open();

    await loadFile('Phrasal Verbs.txt', 'a | b');
    expect(input<HTMLTextAreaElement>('#import-text').value).toBe('a | b');
    expect(input('#import-name').value).toBe('Phrasal Verbs');
    expect(input('input[type="file"]').value).toBe('');

    await type('#import-name', 'Mi nombre');
    await loadFile('Otro.md', 'c | d');
    expect(input('#import-name').value).toBe('Mi nombre');
    expect(input<HTMLTextAreaElement>('#import-text').value).toBe('c | d');
  });

  it('confirmar importa con lo escrito y lleva al libro creado', async () => {
    const { imports, type, importButton, update } = await open();
    await type('#import-name', '  Phrasal Verbs ');
    await type('#import-subject', 'Inglés');
    await type('#import-text', VALID);

    importButton()?.click();
    await update();

    expect(imports.lastInput?.book.name).toBe('Phrasal Verbs');
    expect(imports.lastInput?.book.subject).toBe('Inglés');
    expect(imports.lastInput?.book.cardCount).toBe(4);
    expect(TestBed.inject(Router).url).toBe('/biblioteca/importado-1');
  });

  it('un doble clic importa una vez y muestra "Importando…"', async () => {
    const { imports, type, importButton, update } = await open();
    let release!: () => void;
    imports.gate = new Promise<void>((resolve) => (release = resolve));
    await type('#import-text', VALID);

    importButton()?.click();
    importButton()?.click();
    await update();

    expect(importButton()?.textContent?.trim()).toBe('Importando…');
    expect(importButton()?.disabled).toBe(true);
    expect(imports.calls).toBe(1);
    release();
  });

  it('si sale de la página mientras importa, al terminar no lo saca de donde esté', async () => {
    const { harness, imports, type, importButton, update } = await open();
    let release!: () => void;
    imports.gate = new Promise<void>((resolve) => (release = resolve));
    await type('#import-text', VALID);
    importButton()?.click();
    await update();

    // Se cansa de esperar y se va a Hoy (en la app real, a repasar).
    await harness.navigateByUrl('/hoy');
    release();
    await update();

    expect(TestBed.inject(Router).url).toBe('/hoy');
  });

  it('al volver mientras sigue importando, la muestra en curso y no deja empezar otra; al terminar, lleva al libro', async () => {
    const { harness, imports, input, type, importButton, update } = await open();
    let release!: () => void;
    imports.gate = new Promise<void>((resolve) => (release = resolve));
    await type('#import-name', 'Inglés B2');
    await type('#import-text', VALID);
    importButton()?.click();
    await update();

    await harness.navigateByUrl('/hoy');
    await harness.navigateByUrl('/importar');
    await update();

    expect(input('#import-name').value).toBe('Inglés B2');
    expect(input<HTMLTextAreaElement>('#import-text').value).toBe(VALID);
    expect(importButton()?.textContent?.trim()).toBe('Importando…');
    importButton()?.click();
    await update();
    expect(imports.calls).toBe(1);

    release();
    await update();
    expect(TestBed.inject(Router).url).toBe('/biblioteca/importado-1');
  });

  it('si falla, avisa encima de los botones y conserva todo', async () => {
    const { imports, page, input, type, importButton, update } = await open();
    imports.failWith = new ImportBookError(450, true, new Error('permiso'));
    await type('#import-name', 'Phrasal Verbs');
    await type('#import-text', VALID);

    importButton()?.click();
    await update();

    expect(page().querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo importar el libro. Inténtalo de nuevo.',
    );
    expect(input('#import-name').value).toBe('Phrasal Verbs');
    expect(input<HTMLTextAreaElement>('#import-text').value).toBe(VALID);
    expect(importButton()?.disabled).toBe(false);
  });

  it('sin red previsualiza pero no deja importar; al volver la red, sí', async () => {
    const { connectivity, page, input, type, importButton, update } = await open(false);
    await type('#import-text', VALID);

    expect(page().textContent).toContain('4 tarjetas');
    expect(importButton()?.disabled).toBe(true);
    expect(page().textContent).toContain('Necesitas conexión para guardar cambios.');

    connectivity.setOnline(true);
    await update();
    expect(importButton()?.disabled).toBe(false);
    expect(input<HTMLTextAreaElement>('#import-text').value).toBe(VALID);
  });

  it('salir sin confirmar no escribe nada', async () => {
    const { imports, type } = await open();
    await type('#import-text', VALID);

    await TestBed.inject(Router).navigateByUrl('/biblioteca/x');

    expect(imports.calls).toBe(0);
  });
});
