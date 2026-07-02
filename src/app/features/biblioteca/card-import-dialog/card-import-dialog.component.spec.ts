import { TestBed, type ComponentFixture } from '@angular/core/testing';

import {
  CardImportDialogComponent,
  type CardImportRequest,
} from './card-import-dialog.component';

describe('CardImportDialogComponent', () => {
  function setup(existingCardCount = 0): {
    fixture: ComponentFixture<CardImportDialogComponent>;
    emitted: CardImportRequest[];
  } {
    const fixture = TestBed.createComponent(CardImportDialogComponent);
    fixture.componentRef.setInput('existingCardCount', existingCardCount);
    const emitted: CardImportRequest[] = [];
    fixture.componentInstance.imported.subscribe((request) => emitted.push(request));
    fixture.detectChanges();
    return { fixture, emitted };
  }

  function typeCards(fixture: ComponentFixture<CardImportDialogComponent>): void {
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('#import-text');
    textarea.value = 'to give up | rendirse';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function clickImport(fixture: ComponentFixture<CardImportDialogComponent>): void {
    const buttons: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('button');
    const importButton = Array.from(buttons).find((button) =>
      button.textContent?.includes('Importar'),
    );
    importButton?.click();
    fixture.detectChanges();
  }

  function selectReplaceMode(fixture: ComponentFixture<CardImportDialogComponent>): void {
    const replaceRadio: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[name="import-mode"][value="replace"]',
    );
    replaceRadio.click();
    replaceRadio.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('se crea', () => {
    const { fixture } = setup();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('en el modo por defecto (agregar) emite directo, sin confirmación', () => {
    const { fixture, emitted } = setup(5);
    typeCards(fixture);

    clickImport(fixture);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.mode).toBe('append');
    expect(emitted[0]?.drafts).toEqual([
      { cardType: 'basic', front: 'to give up', back: 'rendirse' },
    ]);
    expect(fixture.nativeElement.querySelector('app-confirm-dialog')).toBeNull();
  });

  it('en modo reemplazar pide confirmación y solo emite al confirmar', () => {
    const { fixture, emitted } = setup(5);
    typeCards(fixture);
    selectReplaceMode(fixture);

    clickImport(fixture);

    // Todavía no emite: se muestra el aviso de pérdida de historial y progreso.
    expect(emitted).toHaveLength(0);
    const confirm: HTMLElement = fixture.nativeElement.querySelector('app-confirm-dialog');
    expect(confirm).not.toBeNull();
    expect(confirm.textContent).toContain('progreso');
    expect(confirm.textContent).toContain('Editar');

    const buttons: NodeListOf<HTMLButtonElement> = confirm.querySelectorAll('button');
    const replaceButton = Array.from(buttons).find((button) =>
      button.textContent?.includes('Reemplazar todo'),
    );
    replaceButton?.click();
    fixture.detectChanges();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.mode).toBe('replace');
  });

  it('cancelar la confirmación de reemplazo no emite y conserva el texto pegado', () => {
    const { fixture, emitted } = setup(5);
    typeCards(fixture);
    selectReplaceMode(fixture);
    clickImport(fixture);

    const confirm: HTMLElement = fixture.nativeElement.querySelector('app-confirm-dialog');
    const buttons: NodeListOf<HTMLButtonElement> = confirm.querySelectorAll('button');
    const cancelButton = Array.from(buttons).find((button) =>
      button.textContent?.includes('Cancelar'),
    );
    cancelButton?.click();
    fixture.detectChanges();

    expect(emitted).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('app-confirm-dialog')).toBeNull();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('#import-text');
    expect(textarea.value).toBe('to give up | rendirse');
  });

  it('en modo reemplazar con el capítulo vacío emite directo (no hay nada que borrar)', () => {
    const { fixture, emitted } = setup(0);
    typeCards(fixture);
    selectReplaceMode(fixture);

    clickImport(fixture);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.mode).toBe('replace');
    expect(fixture.nativeElement.querySelector('app-confirm-dialog')).toBeNull();
  });
});
