import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ActionMenuComponent, type ActionMenuItem } from './action-menu.component';

const ITEMS: ActionMenuItem[] = [
  { id: 'edit', label: 'Editar', icon: 'edit' },
  { id: 'suspend', label: 'Suspender', icon: 'x' },
  { id: 'delete', label: 'Borrar', icon: 'trash', destructive: true },
];

@Component({
  imports: [ActionMenuComponent],
  template: `<app-action-menu
    label="Acciones de «to give up»"
    [items]="items"
    (selected)="chosen = $event"
  />`,
})
class HostComponent {
  readonly items = ITEMS;
  chosen: string | null = null;
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const trigger = (fixture.nativeElement as HTMLElement).querySelector('button');
  if (!trigger) throw new Error('Falta el botón del menú');
  const items = () =>
    Array.from(document.querySelectorAll<HTMLElement>('.cdk-overlay-container [role="menuitem"]'));
  const open = () => {
    trigger.click();
    fixture.detectChanges();
  };
  return { fixture, trigger, items, open };
}

describe('ActionMenuComponent', () => {
  it('el botón lleva el nombre accesible recibido', () => {
    const { trigger } = setup();

    expect(trigger.getAttribute('aria-label')).toBe('Acciones de «to give up»');
  });

  it('abrir muestra las acciones con sus etiquetas en un panel sólido', () => {
    const { open, items } = setup();

    open();

    expect(items().map((item) => item.textContent?.trim())).toEqual([
      'Editar',
      'Suspender',
      'Borrar',
    ]);
    expect(document.querySelector('.cdk-overlay-container [role="menu"]')?.classList).toContain(
      'menu-panel',
    );
  });

  it('elegir una acción la emite y cierra el menú', () => {
    const { fixture, open, items } = setup();
    open();

    items()[2]?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.chosen).toBe('delete');
    expect(items()).toHaveLength(0);
  });

  it('Escape cierra y devuelve el foco al botón', () => {
    const { fixture, open, items, trigger } = setup();
    open();

    items()[0]?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        keyCode: 27,
        bubbles: true,
      } as KeyboardEventInit),
    );
    fixture.detectChanges();

    expect(items()).toHaveLength(0);
    expect(document.activeElement).toBe(trigger);
  });
});
