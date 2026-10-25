import type { GradeRecord } from '@domain/models/grade-record';
import { GradePersistencePort } from '@domain/ports/grade-persistence.port';

interface PendingSave {
  resolve: () => void;
  reject: (error: unknown) => void;
}

// Fake del guardado de calificaciones: guarda lo recibido y deja cada promesa EN VUELO hasta que
// la prueba la resuelve o la rechaza, en orden (`resolveNext`, `rejectNext`). Así se prueba que la
// sesión avanza sin esperar y que un rechazo tardío llega con la sesión ya en otra tarjeta.
export class FakeGradePersistence extends GradePersistencePort {
  readonly records: GradeRecord[] = [];
  private readonly pending: PendingSave[] = [];

  get pendingCount(): number {
    return this.pending.length;
  }

  persistGrade(_uid: string, record: GradeRecord): Promise<void> {
    this.records.push(record);
    return new Promise<void>((resolve, reject) => this.pending.push({ resolve, reject }));
  }

  resolveNext(): void {
    this.takeNext().resolve();
  }

  rejectNext(error: unknown): void {
    this.takeNext().reject(error);
  }

  private takeNext(): PendingSave {
    const next = this.pending.shift();
    if (!next) {
      throw new Error('No hay ningún guardado pendiente.');
    }
    return next;
  }
}
