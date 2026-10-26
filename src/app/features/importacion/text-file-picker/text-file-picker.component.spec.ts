import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Logger } from '@domain/ports/logger.port';
import { FakeLogger } from '@testing/fake-logger';

import { TextFilePickerComponent, type LoadedTextFile } from './text-file-picker.component';

async function render() {
  const logger = new FakeLogger();
  TestBed.configureTestingModule({ providers: [{ provide: Logger, useValue: logger }] });
  const fixture = TestBed.createComponent(TextFilePickerComponent);
  const loaded: LoadedTextFile[] = [];
  fixture.componentInstance.loaded.subscribe((file) => loaded.push(file));
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const fileInput = element.querySelector('input[type="file"]') as HTMLInputElement;
  /** Elige un archivo en el selector (como el navegador: `files` y el evento `change`). */
  const choose = async (file: { name: string; text: () => Promise<string> }) => {
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fileInput.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
  };
  return { element, fileInput, choose, loaded, logger };
}

const readable = (name: string, content: string) =>
  new File([content], name, { type: 'text/plain' });

describe('TextFilePickerComponent', () => {
  it('es un botón "Cargar archivo" que acepta texto plano y Markdown', async () => {
    const { element, fileInput } = await render();

    expect(element.querySelector('label')?.textContent?.trim()).toBe('Cargar archivo');
    expect(fileInput.getAttribute('accept')).toBe('.txt,.md,text/plain');
  });

  it('cargar un archivo entrega su nombre y su texto', async () => {
    const { choose, loaded } = await render();

    await choose(readable('unidad-3.txt', 'a | b'));

    expect(loaded).toEqual([{ name: 'unidad-3.txt', text: 'a | b' }]);
  });

  it('si el archivo no se puede leer, avisa «No se pudo leer el archivo.» y lo registra', async () => {
    // P. ej. un .txt que está en Drive sin descargar, elegido sin red.
    const { element, choose, loaded, logger } = await render();
    const failure = new DOMException('No se pudo leer', 'NotReadableError');

    await choose({ name: 'Phrasal Verbs.txt', text: () => Promise.reject(failure) });

    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo leer el archivo.',
    );
    expect(logger.entries).toEqual([
      { level: 'error', message: 'No se pudo leer el archivo elegido', cause: failure },
    ]);
    expect(loaded).toEqual([]);

    await choose(readable('otro.txt', 'c | d'));
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('la etiqueta que hace de botón pinta el foco cuando lo tiene el selector oculto', async () => {
    const { element, fileInput } = await render();

    expect(fileInput.classList).toContain('sr-only');
    expect(element.querySelector('label')?.className).toContain('focus-within:outline-2');
  });
});
