import { InteractivityChecker } from '@angular/cdk/a11y';
import { vi } from 'vitest';

// Ayudas para probar diálogos del CDK en jsdom, que no calcula geometría: sin simular la
// visibilidad, el CDK no movería el foco a ningún control.

export function allowDialogFocusInJsdom(): void {
  vi.spyOn(InteractivityChecker.prototype, 'isVisible').mockReturnValue(true);
}

/** El contenedor del diálogo abierto (con su `role="dialog"`). */
export function openDialog(): HTMLElement {
  const container = document.querySelector<HTMLElement>('.cdk-overlay-container [role="dialog"]');
  if (!container) {
    throw new Error('No hay diálogo abierto');
  }
  return container;
}

export function dialogButton(text: string): HTMLButtonElement | undefined {
  return Array.from(openDialog().querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
}

export function typeInto(selector: string, value: string): HTMLInputElement {
  const input = openDialog().querySelector<HTMLInputElement>(selector);
  if (!input) {
    throw new Error(`No existe ${selector} en el diálogo`);
  }
  input.value = value;
  input.dispatchEvent(new Event('input'));
  return input;
}

export function pressEscape(): void {
  (document.activeElement ?? document.body).dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      keyCode: 27,
      bubbles: true,
    } as KeyboardEventInit),
  );
}
