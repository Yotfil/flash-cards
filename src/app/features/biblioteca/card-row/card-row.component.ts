import { Component, computed, inject, input, output } from '@angular/core';

import type { Card } from '@domain/models/card.model';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { CardsService } from '@services/cards/cards.service';
import { IconComponent } from '@shared/icon/icon.component';
import {
  ActionMenuComponent,
  type ActionMenuItem,
} from '@shared/menu/action-menu/action-menu.component';

import { createImmediateSetting } from '../../ajustes/immediate-setting';
import { BIBLIOTECA_COPY, cardDisplayName } from '../biblioteca.copy';

// Fila de una tarjeta en el capítulo: el cuerpo abre la edición (o alterna la casilla en modo
// selección) y el menú `⋯` ofrece editar, suspender/reactivar y borrar. Suspender se guarda al
// tocar, como un ajuste inmediato; editar y borrar los resuelve la lista, que abre los diálogos.
@Component({
  selector: 'app-card-row',
  imports: [ActionMenuComponent, IconComponent],
  templateUrl: './card-row.component.html',
  styleUrl: './card-row.component.scss',
})
export class CardRowComponent {
  readonly card = input.required<Card>();
  readonly isDuplicate = input(false);
  readonly selectionMode = input(false);
  readonly selected = input(false);
  readonly edit = output<void>();
  readonly toggleSelect = output<void>();
  readonly delete = output<void>();

  private readonly cards = inject(CardsService);

  protected readonly online = inject(ConnectivityPort).online;
  protected readonly copy = BIBLIOTECA_COPY.cardRow;
  protected readonly suspension = createImmediateSetting(
    () => this.card().suspended,
    (suspended) => this.cards.setSuspended(this.card().id, suspended),
    inject(Logger),
  );
  protected readonly isCloze = computed(() => this.card().cardType === 'cloze');
  protected readonly name = computed(() => cardDisplayName(this.card()));
  protected readonly menuItems = computed<ActionMenuItem[]>(() => [
    { id: 'edit', label: this.copy.edit, icon: 'edit' },
    this.suspension.value()
      ? { id: 'suspend', label: this.copy.reactivate, icon: 'play' }
      : { id: 'suspend', label: this.copy.suspend, icon: 'pause' },
    { id: 'delete', label: this.copy.delete, icon: 'trash', destructive: true },
  ]);

  protected openBody(): void {
    if (this.selectionMode()) {
      this.toggleSelect.emit();
    } else {
      this.edit.emit();
    }
  }

  protected runAction(id: string): void {
    if (id === 'edit') {
      this.edit.emit();
    } else if (id === 'suspend') {
      // El ajuste inmediato atrapa y explica sus propios fallos: no hay nada que esperar aquí.
      void this.suspension.change(!this.suspension.value());
    } else if (id === 'delete') {
      this.delete.emit();
    }
  }
}
