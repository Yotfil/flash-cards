import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ModalComponent } from './modal.component';

/** Anfitrión mínimo para proyectar contenido y capturar `dismissed`. */
@Component({
  imports: [ModalComponent],
  template: `
    <app-modal
      label="Diálogo de prueba"
      [pending]="pending()"
      (dismissed)="dismissals = dismissals + 1"
    >
      <p>contenido</p>
    </app-modal>
  `,
})
class HostComponent {
  readonly pending = input(false);
  dismissals = 0;
}

describe('ModalComponent', () => {
  function render(pending: boolean): { host: HostComponent; dialog: HTMLElement } {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentRef.setInput('pending', pending);
    fixture.detectChanges();
    const dialog = fixture.debugElement.query(By.css('[role="dialog"]'))
      .nativeElement as HTMLElement;
    return { host: fixture.componentInstance, dialog };
  }

  it('pinta el contenido proyectado con los atributos accesibles', () => {
    const { dialog } = render(false);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Diálogo de prueba');
    expect(dialog.textContent).toContain('contenido');
  });

  it('Escape emite dismissed, salvo mientras está pending', () => {
    const escape = () =>
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    const idle = render(false);
    idle.dialog.dispatchEvent(escape());
    expect(idle.host.dismissals).toBe(1);

    const busy = render(true);
    busy.dialog.dispatchEvent(escape());
    expect(busy.host.dismissals).toBe(0);
  });
});
