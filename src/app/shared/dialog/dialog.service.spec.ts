import { InteractivityChecker } from '@angular/cdk/a11y';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AppDialogRef, DIALOG_DATA, DialogService, type DialogSize } from './dialog.service';

// Contenido de prueba: inyecta su referencia y sus datos, como lo hará cualquier formulario.
@Component({
  template: `
    <p>{{ data.question }}</p>
    <input aria-label="Nombre" />
    <button type="button" (click)="dialogRef.close('ok')">Guardar</button>
  `,
})
class TestDialogContentComponent {
  readonly dialogRef = inject<AppDialogRef<string>>(AppDialogRef);
  readonly data = inject<{ question: string }>(DIALOG_DATA);
}

function overlayElement(selector: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.cdk-overlay-container ${selector}`);
}

function pressEscape(): void {
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      keyCode: 27,
      bubbles: true,
    } as KeyboardEventInit),
  );
}

describe('DialogService', () => {
  let opener: HTMLButtonElement;

  beforeEach(() => {
    // jsdom no calcula geometría: sin esto el CDK cree que ningún control es visible (no movería el
    // foco) y que el documento nunca se desplaza (no bloquearía el scroll).
    vi.spyOn(InteractivityChecker.prototype, 'isVisible').mockReturnValue(true);
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000);

    opener = document.createElement('button');
    opener.textContent = 'Abrir';
    document.body.appendChild(opener);
    opener.focus();
  });

  afterEach(() => {
    opener.remove();
    vi.restoreAllMocks();
  });

  function open(size?: DialogSize): AppDialogRef<string> {
    const ref = TestBed.inject(DialogService).open<string, { question: string }>(
      TestDialogContentComponent,
      { label: 'Nuevo libro', data: { question: '¿Cómo se llama?' }, ...(size ? { size } : {}) },
    );
    TestBed.tick();
    return ref;
  }

  it('se anuncia como diálogo modal con su nombre accesible y recibe sus datos', () => {
    open();

    const container = overlayElement('[role="dialog"]');
    expect(container?.getAttribute('aria-modal')).toBe('true');
    expect(container?.getAttribute('aria-label')).toBe('Nuevo libro');
    expect(container?.textContent).toContain('¿Cómo se llama?');
  });

  it('mueve el foco al primer control y lo devuelve al botón de origen al cerrar', async () => {
    const ref = open();

    expect(document.activeElement?.getAttribute('aria-label')).toBe('Nombre');

    ref.close();
    await ref.closed;
    TestBed.tick();

    expect(document.activeElement).toBe(opener);
  });

  it('Escape lo cierra sin resultado', async () => {
    const ref = open();

    pressEscape();

    await expect(ref.closed).resolves.toBeUndefined();
    expect(overlayElement('[role="dialog"]')).toBeNull();
  });

  it('mientras está ocupado, Escape no lo cierra y se anuncia como ocupado', () => {
    const ref = open();

    ref.setPending(true);
    pressEscape();

    const container = overlayElement('[role="dialog"]');
    expect(container).not.toBeNull();
    expect(container?.getAttribute('aria-busy')).toBe('true');

    ref.setPending(false);
    expect(container?.hasAttribute('aria-busy')).toBe(false);
    pressEscape();
    expect(overlayElement('[role="dialog"]')).toBeNull();
  });

  it('tocar el fondo oscurecido no lo cierra', () => {
    open();

    overlayElement('.cdk-overlay-backdrop')?.click();

    expect(overlayElement('[role="dialog"]')).not.toBeNull();
  });

  it('entrega el resultado con el que el contenido lo cerró', async () => {
    const ref = open();

    overlayElement('button')?.click();

    await expect(ref.closed).resolves.toBe('ok');
  });

  it('es mediano por defecto y aplica el tamaño grande', () => {
    const medium = open();
    expect(overlayElement('.cdk-overlay-pane')?.classList).toContain('dialog-md');
    medium.close();

    open('lg');
    expect(overlayElement('.cdk-overlay-pane')?.classList).toContain('dialog-lg');
  });

  it('el fondo lleva la clase del diálogo y el documento bloquea su scroll', () => {
    open();

    expect(overlayElement('.cdk-overlay-backdrop')?.classList).toContain('dialog-backdrop');
    expect(document.documentElement.classList).toContain('cdk-global-scrollblock');
  });
});
