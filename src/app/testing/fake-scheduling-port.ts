import type { CardScheduling } from '@domain/models/card.model';
import { RATINGS, type Rating } from '@domain/models/rating';
import { SchedulingPort, type SchedulingPreview } from '@domain/ports/scheduling.port';

type PreviewGenerator = (
  scheduling: CardScheduling,
  now: Date,
) => Record<Rating, SchedulingPreview>;

const DAY_MS = 86_400_000;

// Fake programable del puerto de programación: por defecto cada grado vence en tantos días como
// vale (1 → mañana, 4 → en cuatro días), así las pruebas leen fácil qué grado se guardó.
// `setPreview` cambia el generador y `calls` registra cada llamada (la sesión de repaso afirma
// así que previsualiza al mostrar y vuelve a calcular al calificar).
export class FakeSchedulingPort extends SchedulingPort {
  readonly calls: { scheduling: CardScheduling; now: Date }[] = [];
  private generator: PreviewGenerator = byGradeInDays;

  setPreview(generator: PreviewGenerator): void {
    this.generator = generator;
  }

  preview(scheduling: CardScheduling, now: Date): Record<Rating, SchedulingPreview> {
    this.calls.push({ scheduling, now });
    return this.generator(scheduling, now);
  }
}

function byGradeInDays(scheduling: CardScheduling, now: Date): Record<Rating, SchedulingPreview> {
  const entries = RATINGS.map((rating) => {
    const due = new Date(now.getTime() + rating * DAY_MS);
    const preview: SchedulingPreview = {
      scheduling: { ...scheduling, due, scheduledDays: rating, lastReview: now },
      intervalDays: rating,
      due,
      log: {
        state: scheduling.state,
        due: scheduling.due,
        stability: scheduling.stability,
        difficulty: scheduling.difficulty,
        elapsedDays: scheduling.elapsedDays,
        lastElapsedDays: 0,
        scheduledDays: scheduling.scheduledDays,
      },
    };
    return [rating, preview] as const;
  });
  return Object.fromEntries(entries) as Record<Rating, SchedulingPreview>;
}
