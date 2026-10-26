import { Component, computed, inject, type OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PracticePackagesService } from '@services/practice-ai/practice-packages.service';

import { StudyLaunchButtonComponent } from '../../estudio/study-launch-button/study-launch-button.component';
import { PRACTICA_IA_COPY, todayLabel, todayRowLabel } from '../practica-ia.copy';

// El bloque "Práctica con IA" de Hoy, debajo de los libros: un aviso discreto por paquete con
// algo para hoy (o ya practicado), sin robarle el foco a la cola. Sin paquetes no aparece; si su
// lectura falla, muestra su propio error y el resto de Hoy sigue igual.
@Component({
  selector: 'app-practice-ai-today-block',
  imports: [RouterLink, StudyLaunchButtonComponent],
  templateUrl: './practice-ai-today-block.component.html',
  styleUrl: './practice-ai-today-block.component.scss',
})
export class PracticeAiTodayBlockComponent implements OnInit {
  protected readonly packages = inject(PracticePackagesService);

  protected readonly copy = PRACTICA_IA_COPY;
  protected readonly destination = ['/practica-ia'];
  protected readonly discard = () => this.packages.discardPrepared();
  protected readonly hasAny = computed(
    () => this.packages.open().length + this.packages.completed().length > 0,
  );
  protected readonly rows = computed(() =>
    this.packages.open().flatMap((pkg) => {
      const practiced = this.packages.practicedToday(pkg);
      const pending = this.packages.pendingCountFor(pkg);
      if (!practiced && pending === 0) {
        return [];
      }
      return [
        {
          id: pkg.id,
          text: practiced
            ? `${pkg.name} · ${todayLabel(pending, true)}`
            : todayRowLabel(pkg.name, pending),
          label: practiced ? this.copy.practiceAgain : this.copy.practiceToday,
          prepare: () => this.packages.prepareTodayPractice(pkg.id),
        },
      ];
    }),
  );

  ngOnInit(): void {
    this.packages.reload();
  }
}
