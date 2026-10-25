import { Component, computed, inject, type OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PracticePackagesService } from '@services/practice-ai/practice-packages.service';
import { ErrorStateComponent } from '@shared/error-state/error-state.component';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';

import { PRACTICA_IA_COPY, itemCountLabel } from '../practica-ia.copy';

// El historial de paquetes completados, el más reciente primero. Cada fila abre el paquete en
// solo lectura (con su prompt para copiar).
@Component({
  selector: 'app-completed-packages-page',
  imports: [RouterLink, ErrorStateComponent, SkeletonComponent],
  templateUrl: './completed-packages-page.component.html',
  styleUrl: './completed-packages-page.component.scss',
})
export class CompletedPackagesPageComponent implements OnInit {
  protected readonly packages = inject(PracticePackagesService);

  protected readonly copy = PRACTICA_IA_COPY;
  protected readonly rows = computed(() =>
    this.packages.completed().map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      date: pkg.completedAt?.toLocaleDateString('es') ?? '',
      items: itemCountLabel(pkg.itemOrder.length),
    })),
  );

  ngOnInit(): void {
    this.packages.reload();
  }
}
