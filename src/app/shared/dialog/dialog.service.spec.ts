import { InteractivityChecker } from '@angular/cdk/a11y';
import { Location } from '@angular/common';
import { ApplicationRef, Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withRouterConfig } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

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

@Component({ template: '' })
class BlankPageComponent {}

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

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

  describe('un guardado que no confirma', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('apuntado al plazo, a los 6 s deja de estar ocupado: Escape lo cierra y avisa al contenido', async () => {
      const ref = open();
      ref.setPending(true, { releaseWhenSlow: true });

      vi.advanceTimersByTime(5999);
      pressEscape();
      expect(overlayElement('[role="dialog"]')).not.toBeNull();
      expect(ref.savingTooLong()).toBe(false);

      vi.advanceTimersByTime(1);
      expect(ref.savingTooLong()).toBe(true);
      expect(overlayElement('[role="dialog"]')?.hasAttribute('aria-busy')).toBe(false);
      pressEscape();
      await expect(ref.closed).resolves.toBeUndefined();
    });

    it('sin apuntarse (un borrado), sigue ocupado pasado el plazo', () => {
      const ref = open();
      ref.setPending(true);

      vi.advanceTimersByTime(10_000);
      pressEscape();

      expect(overlayElement('[role="dialog"]')).not.toBeNull();
      expect(ref.savingTooLong()).toBe(false);
    });

    it('si termina antes del plazo, el aviso no llega', () => {
      const ref = open();
      ref.setPending(true, { releaseWhenSlow: true });

      vi.advanceTimersByTime(2000);
      ref.setPending(false);
      vi.advanceTimersByTime(10_000);

      expect(ref.savingTooLong()).toBe(false);
    });

    it('al cerrarse, el plazo se cancela', () => {
      const ref = open();
      ref.setPending(true, { releaseWhenSlow: true });

      ref.close();
      vi.advanceTimersByTime(10_000);

      expect(ref.savingTooLong()).toBe(false);
    });
  });

  describe('el "atrás" del sistema', () => {
    // Como en la app: el router restaura el historial de una navegación cancelada.
    async function onSecondPage() {
      TestBed.configureTestingModule({
        providers: [
          provideRouter(
            [
              { path: 'a', component: BlankPageComponent },
              { path: 'b', component: BlankPageComponent },
            ],
            withRouterConfig({ canceledNavigationResolution: 'computed' }),
          ),
        ],
      });
      const harness = await RouterTestingHarness.create();
      // Lo hace el arranque de la app; sin esto el router de las pruebas no oye el "atrás".
      TestBed.inject(Router).setUpLocationChangeListener();
      await harness.navigateByUrl('/a');
      await harness.navigateByUrl('/b');
      const back = async () => {
        TestBed.inject(Location).back();
        await wait(60);
        await TestBed.inject(ApplicationRef).whenStable();
        await wait(60);
      };
      const url = () => TestBed.inject(Router).url;
      const path = () => TestBed.inject(Location).path();
      return { back, url, path };
    }

    it('con un diálogo abierto, lo cierra sin resultado y no cambia de pantalla', async () => {
      const { back, url, path } = await onSecondPage();
      const ref = open();

      await back();

      await expect(ref.closed).resolves.toBeUndefined();
      expect(overlayElement('[role="dialog"]')).toBeNull();
      expect(url()).toBe('/b');
      expect(path()).toBe('/b');

      await back();
      expect(url()).toBe('/a');
    });

    it('con el diálogo ocupado, no hace nada', async () => {
      const { back, url } = await onSecondPage();
      const ref = open();
      ref.setPending(true);

      await back();

      expect(overlayElement('[role="dialog"]')).not.toBeNull();
      expect(url()).toBe('/b');
    });

    it('tras el plazo de un guardado que no confirma, lo cierra', async () => {
      const { back, url } = await onSecondPage();
      vi.useFakeTimers();
      const ref = open();
      ref.setPending(true, { releaseWhenSlow: true });
      vi.advanceTimersByTime(6000);
      vi.useRealTimers();

      await back();

      await expect(ref.closed).resolves.toBeUndefined();
      expect(url()).toBe('/b');
    });

    it('con dos diálogos apilados, cierra solo el de arriba', async () => {
      const { back, url } = await onSecondPage();
      const below = open();
      const above = open();

      await back();

      await expect(above.closed).resolves.toBeUndefined();
      expect(document.querySelectorAll('.cdk-overlay-container [role="dialog"]')).toHaveLength(1);
      below.close();
      expect(url()).toBe('/b');
    });

    it('sin diálogos, navega como siempre', async () => {
      const { back, url } = await onSecondPage();

      await back();

      expect(url()).toBe('/a');
    });
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
