import { Injectable } from '@angular/core';

import type { PracticeItem } from '@domain/models/practice-package';
import { HandoffTray } from '@services/handoff/handoff-tray';

/** Una práctica de paquete lista para empezar: sus ítems del día, ya barajados. */
export interface PreparedPracticeAi {
  readonly packageId: string;
  readonly dayId: string;
  readonly items: readonly PracticeItem[];
}

// La bandeja de la práctica con IA: el detalle del paquete (o Hoy) entrega aquí y la pantalla de
// práctica la toma una sola vez (ver `HandoffTray`).
@Injectable({ providedIn: 'root' })
export class PracticeAiHandoffService extends HandoffTray<PreparedPracticeAi> {}
