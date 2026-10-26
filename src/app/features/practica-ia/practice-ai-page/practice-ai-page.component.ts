import { Component, DestroyRef, computed, inject, type OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { Rating } from '@domain/models/rating';
import { PracticeAiHandoffService } from '@services/practice-ai/practice-ai-handoff.service';
import { PracticeAiSessionService } from '@services/practice-ai/practice-ai-session.service';
import { PracticePackagesService } from '@services/practice-ai/practice-packages.service';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { SessionTopBarComponent } from '@shared/session-top-bar/session-top-bar.component';

import { positionLabel } from '../../practica/practica.copy';
import { FlipCardComponent } from '../../repaso/flip-card/flip-card.component';
import { RatingBarComponent } from '../../repaso/rating-bar/rating-bar.component';
import { rejectedGradeMessage } from '../../repaso/repaso.copy';
import { SessionSummaryComponent } from '../../repaso/session-summary/session-summary.component';
import { OfflineIndicatorComponent } from '../../shell/offline-indicator/offline-indicator.component';
import { CopyPromptButtonComponent } from '../copy-prompt-button/copy-prompt-button.component';
import { PRACTICA_IA_COPY, hardCountLabel, practicedLabel } from '../practica-ia.copy';

const RATING_KEYS: Readonly<Record<string, Rating>> = { '1': 1, '2': 2, '3': 3, '4': 4 };

// La práctica de un paquete a pantalla completa, con las piezas del repaso (tarjeta, cuatro
// cerebros sin intervalos, cierre) y sin programación. Cada entrada toma la práctica entregada
// una sola vez; sin ella, vuelve a la Biblioteca. Si el paquete se borró en otro dispositivo, la
// práctica se cierra con un aviso y el camino a la Biblioteca. Teclado: Espacio revela, 1-4 califican.
@Component({
  selector: 'app-practice-ai-page',
  imports: [
    CopyPromptButtonComponent,
    EmptyStateComponent,
    FlipCardComponent,
    OfflineIndicatorComponent,
    RatingBarComponent,
    RouterLink,
    SessionSummaryComponent,
    SessionTopBarComponent,
  ],
  templateUrl: './practice-ai-page.component.html',
  styleUrl: './practice-ai-page.component.scss',
  host: { '(window:keydown)': 'onKeydown($event)' },
})
export class PracticeAiPageComponent implements OnInit {
  protected readonly session = inject(PracticeAiSessionService);
  private readonly packages = inject(PracticePackagesService);
  private readonly handoff = inject(PracticeAiHandoffService);
  private readonly router = inject(Router);

  protected readonly copy = PRACTICA_IA_COPY;
  protected readonly practicedLabel = practicedLabel;
  protected readonly positionText = computed(() =>
    positionLabel(this.session.position(), this.session.total()),
  );
  /** Cada aparición crea una tarjeta nueva (con su entrada), aunque el ítem vuelva por un rechazo. */
  protected readonly appearance = computed(() => {
    const face = this.session.current();
    return face ? [{ key: `${this.session.position()}-${face.id}`, face }] : [];
  });
  protected readonly alertMessages = computed(() =>
    this.session.alerts().map((alert) => rejectedGradeMessage(alert.front)),
  );
  protected readonly hardText = computed(() => hardCountLabel(this.session.hardCount()));
  /** Con el día de la práctica: sus difíciles son los que el cierre anuncia, aunque ya sea otro día. */
  protected readonly prompt = computed(() => {
    const packageId = this.session.packageId();
    const dayId = this.session.dayId();
    return packageId && dayId ? this.packages.promptFor(packageId, dayId) : null;
  });
  private packageId: string | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.session.reset());
  }

  ngOnInit(): void {
    const prepared = this.handoff.take();
    if (!prepared || prepared.items.length === 0) {
      void this.router.navigate(['/biblioteca']);
      return;
    }
    this.packageId = prepared.packageId;
    this.session.start(prepared);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.repeat || this.session.status() !== 'active') {
      return;
    }
    const rating = RATING_KEYS[event.key];
    if (rating) {
      if (this.session.revealed()) {
        this.session.grade(rating);
      }
      return;
    }
    // Con el foco en un botón, Espacio es de ese botón (su clic nativo).
    if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      this.session.reveal();
    }
  }

  /** "Salir" y "Volver al paquete": al detalle del paquete; la práctica se vacía al salir. */
  protected backToPackage(): void {
    void this.router.navigate(this.packageId ? ['/paquetes', this.packageId] : ['/biblioteca']);
  }
}
