import { Component, computed, input } from '@angular/core';

// Esqueleto de carga: siluetas con la forma aproximada del contenido que viene, en lugar de un
// indicador giratorio. La región se anuncia como ocupada; las siluetas no tienen texto y se
// ocultan a tecnologías de asistencia.
@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
  host: { 'aria-busy': 'true', class: 'flex flex-col gap-3' },
})
export class SkeletonComponent {
  readonly lines = input(3);
  readonly variant = input<'text' | 'card'>('text');

  protected readonly blocks = computed(() =>
    Array.from({ length: this.lines() }, (_, index) => ({
      index,
      // La última línea de un párrafo suele ser más corta: la silueta lo imita.
      isLast: index === this.lines() - 1 && this.lines() > 1,
    })),
  );
}
