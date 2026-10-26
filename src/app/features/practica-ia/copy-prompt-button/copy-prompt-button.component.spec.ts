import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FileDeliveryPort } from '@domain/ports/file-delivery.port';
import { Logger } from '@domain/ports/logger.port';
import { FakeFileDelivery } from '@testing/fake-file-delivery';
import { FakeLogger } from '@testing/fake-logger';

import { CopyPromptButtonComponent } from './copy-prompt-button.component';

async function render(prompt: string | null, options: { fail?: boolean } = {}) {
  const delivery = new FakeFileDelivery();
  if (options.fail) {
    delivery.failWith.copyText = new Error('sin portapapeles');
  }
  TestBed.configureTestingModule({
    providers: [
      { provide: FileDeliveryPort, useValue: delivery },
      { provide: Logger, useValue: new FakeLogger() },
    ],
  });
  const fixture = TestBed.createComponent(CopyPromptButtonComponent);
  fixture.componentRef.setInput('prompt', prompt);
  fixture.componentRef.setInput('label', 'Copiar prompt de hoy');
  fixture.componentRef.setInput('disabledHint', 'Practica primero para armar el prompt de hoy.');
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const click = async () => {
    element.querySelector('button')?.click();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  return { element, delivery, click };
}

describe('CopyPromptButtonComponent', () => {
  it('copia el prompt completo y lo confirma en una región anunciada', async () => {
    const { element, delivery, click } = await render('El prompt de hoy');

    await click();

    expect(delivery.copied).toEqual(['El prompt de hoy']);
    expect(element.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Prompt copiado. Pégalo en tu chat de IA.',
    );
    expect(element.querySelector('textarea')).toBeNull();
  });

  it('si el portapapeles falla, muestra el prompt para copiarlo a mano', async () => {
    const { element, click } = await render('El prompt de hoy', { fail: true });

    await click();

    const area = element.querySelector('textarea');
    expect(area?.readOnly).toBe(true);
    expect(area?.value).toBe('El prompt de hoy');
    expect(element.textContent).toContain(
      'No se pudo copiar automáticamente. Selecciona el texto y cópialo.',
    );
  });

  it('sin prompt está deshabilitado y dice por qué', async () => {
    const { element } = await render(null);
    const button = element.querySelector('button');

    expect(button?.disabled).toBe(true);
    const hint = element.querySelector(`#${button?.getAttribute('aria-describedby')}`);
    expect(hint?.textContent?.trim()).toBe('Practica primero para armar el prompt de hoy.');
  });
});
