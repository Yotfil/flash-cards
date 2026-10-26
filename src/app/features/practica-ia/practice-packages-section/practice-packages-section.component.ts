import { Component, computed, inject, type OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { PracticePackage } from '@domain/models/practice-package';
import { PracticePackagesService } from '@services/practice-ai/practice-packages.service';
import { DialogService } from '@shared/dialog/dialog.service';
import { SkeletonComponent } from '@shared/skeleton/skeleton.component';

import {
  PackageFormDialogComponent,
  type PackageFormDialogData,
} from '../package-form-dialog/package-form-dialog.component';
import { PRACTICA_IA_COPY, itemsLabel, todayLabel } from '../practica-ia.copy';

// "Práctica con IA" en la Biblioteca, debajo de los libros: los paquetes abiertos con lo de hoy,
// "Nuevo paquete" y el enlace al historial. Tiene sus propios estados de carga y error: un fallo
// aquí no toca la lista de libros.
@Component({
  selector: 'app-practice-packages-section',
  imports: [RouterLink, SkeletonComponent],
  templateUrl: './practice-packages-section.component.html',
  styleUrl: './practice-packages-section.component.scss',
})
export class PracticePackagesSectionComponent implements OnInit {
  protected readonly packages = inject(PracticePackagesService);
  private readonly dialogs = inject(DialogService);

  protected readonly copy = PRACTICA_IA_COPY;
  protected readonly rows = computed(() =>
    this.packages.open().map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      items: itemsLabel(pkg.itemOrder.length, pkg.capacity),
      today: this.todayText(pkg),
    })),
  );

  ngOnInit(): void {
    this.packages.reload();
  }

  protected createPackage(): void {
    this.dialogs.open<PracticePackage, PackageFormDialogData>(PackageFormDialogComponent, {
      label: this.copy.packageForm.createTitle,
      size: 'sm',
      data: { mode: 'create' },
    });
  }

  private todayText(pkg: PracticePackage): string {
    return todayLabel(this.packages.pendingCountFor(pkg), this.packages.practicedToday(pkg));
  }
}
