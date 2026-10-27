import { DIALOG_DATA, Dialog, type DialogRef } from '@angular/cdk/dialog';
import { hasModifierKey } from '@angular/cdk/keycodes';
import type { ComponentType } from '@angular/cdk/portal';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { watchSlow } from './slow-save';

// Diálogos modales abiertos por servicio, sobre el diálogo del CDK: el CDK resuelve la trampa y la
// devolución del foco, el bloqueo del scroll, el apilado y `aria-modal`. Aquí se fija la política
// de Cadence: nombre accesible obligatorio, tres tamaños, Escape cierra desde cualquier lugar salvo
// que el contenido esté ocupado, y tocar el fondo NO cierra. El contenido solo se cierra con éxito
// (o al cancelar): si su acción falla, sigue abierto mostrando el error.

export { DIALOG_DATA };

export type DialogSize = 'sm' | 'md' | 'lg';

export interface DialogOptions<TData> {
  /** Nombre accesible del diálogo (lo leen los lectores de pantalla al abrirlo). */
  readonly label: string;
  readonly size?: DialogSize;
  readonly data?: TData;
}

export interface PendingOptions {
  /**
   * El guardado queda en el dispositivo aunque no confirme (crear o editar un libro, un capítulo,
   * una tarjeta, un paquete) o seguirá al volver la red (importar): pasado el plazo, el diálogo
   * deja de estar ocupado para que el usuario pueda cerrarlo. Los borrados no se apuntan.
   */
  readonly releaseWhenSlow?: boolean;
}

/** Lo que el contenido de un diálogo inyecta para cerrarlo o marcarlo como ocupado. */
export class AppDialogRef<TResult = unknown> {
  /** Se resuelve con el resultado del cierre, o `undefined` si se cerró sin resultado. */
  readonly closed: Promise<TResult | undefined>;
  private pending = false;
  private readonly slow = signal(false);
  /** El guardado lleva el plazo sin confirmar: el contenido muestra su aviso y deja cerrar. */
  readonly savingTooLong = this.slow.asReadonly();
  private cancelSlowWatch: (() => void) | null = null;

  constructor(private readonly cdkRef: DialogRef<TResult, unknown>) {
    this.closed = firstValueFrom(cdkRef.closed);
    cdkRef.closed.subscribe(() => this.stopSlowWatch());
  }

  get isPending(): boolean {
    return this.pending;
  }

  close(result?: TResult): void {
    this.cdkRef.close(result);
  }

  /**
   * Ocupado (por ejemplo, guardando): Escape y "atrás" no cierran y el diálogo se anuncia como
   * ocupado. Con `releaseWhenSlow`, pasado el plazo deja de estarlo y avisa con `savingTooLong`.
   */
  setPending(pending: boolean, options: PendingOptions = {}): void {
    this.stopSlowWatch();
    this.markBusy(pending);
    if (pending && options.releaseWhenSlow) {
      this.cancelSlowWatch = watchSlow(() => {
        this.markBusy(false);
        this.slow.set(true);
      });
    }
  }

  private markBusy(busy: boolean): void {
    this.pending = busy;
    const container = this.cdkRef.overlayRef.overlayElement.querySelector('[role="dialog"]');
    if (busy) {
      container?.setAttribute('aria-busy', 'true');
    } else {
      container?.removeAttribute('aria-busy');
    }
  }

  private stopSlowWatch(): void {
    this.cancelSlowWatch?.();
    this.cancelSlowWatch = null;
    this.slow.set(false);
  }
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(Dialog);

  open<TResult, TData = void>(
    component: ComponentType<unknown>,
    options: DialogOptions<TData>,
  ): AppDialogRef<TResult> {
    let appRef: AppDialogRef<TResult> | undefined;
    const cdkRef = this.dialog.open<TResult, TData>(component, {
      data: options.data ?? null,
      ariaLabel: options.label,
      ariaModal: true,
      disableClose: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      hasBackdrop: true,
      backdropClass: 'dialog-backdrop',
      panelClass: ['dialog-panel', `dialog-${options.size ?? 'md'}`],
      // El CDK llama a esta función con su referencia antes de crear el contenido, así que el
      // contenido ya puede inyectar `AppDialogRef`.
      providers: (dialogRef) => {
        appRef = new AppDialogRef<TResult>(dialogRef);
        return [{ provide: AppDialogRef, useValue: appRef }];
      },
    });
    if (!appRef) {
      throw new Error('El diálogo se abrió sin su referencia');
    }
    const ref = appRef;
    cdkRef.keydownEvents.subscribe((event) => {
      if (event.key === 'Escape' && !hasModifierKey(event)) {
        event.preventDefault();
        if (!ref.isPending) {
          ref.close();
        }
      }
    });
    return ref;
  }
}
