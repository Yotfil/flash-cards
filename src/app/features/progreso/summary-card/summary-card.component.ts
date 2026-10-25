import { Component, input } from '@angular/core';

// Una métrica del día: el número grande y lo que significa debajo ("Pendientes hoy").
@Component({
  selector: 'app-summary-card',
  templateUrl: './summary-card.component.html',
  styleUrl: './summary-card.component.scss',
})
export class SummaryCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
}
