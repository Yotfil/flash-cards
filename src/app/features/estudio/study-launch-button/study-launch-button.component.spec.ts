import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import type { Card } from '@domain/models/card.model';
import { Logger } from '@domain/ports/logger.port';
import { StudyHandoffService } from '@services/queue/study-handoff.service';
import { aCard } from '@testing/fake-card-repository';
import { FakeLogger } from '@testing/fake-logger';

import { StudyLaunchButtonComponent } from './study-launch-button.component';

@Component({ template: '' })
class BlankPageComponent {}

const SOURCE = { kind: 'chapter', bookId: 'b1', chapterId: 'c1' } as const;

async function render(
  prepare: () => Promise<Card[]>,
  variant: 'primary' | 'secondary' = 'primary',
) {
  const logger = new FakeLogger();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'repaso', component: BlankPageComponent }]),
      { provide: Logger, useValue: logger },
    ],
  });
  const fixture = TestBed.createComponent(StudyLaunchButtonComponent);
  fixture.componentRef.setInput('label', 'Estudiar este capítulo');
  fixture.componentRef.setInput('variant', variant);
  fixture.componentRef.setInput('prepare', prepare);
  fixture.componentRef.setInput('source', SOURCE);
  fixture.componentRef.setInput(
    'emptyMessage',
    'Estás al día con este capítulo. No hay tarjetas para repasar ahora.',
  );
  fixture.componentRef.setInput(
    'errorMessage',
    'No se pudo preparar la sesión. Inténtalo de nuevo.',
  );
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const update = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
  };
  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  return { fixture, element, update, button, logger };
}

describe('StudyLaunchButtonComponent', () => {
  it('mientras prepara dice "Preparando…", se deshabilita y un segundo toque no prepara otra vez', async () => {
    let release!: (cards: Card[]) => void;
    const prepare = vi.fn(() => new Promise<Card[]>((resolve) => (release = resolve)));
    const { button, update } = await render(prepare);

    button('Estudiar este capítulo')?.click();
    button('Estudiar este capítulo')?.click();
    await update();

    expect(button('Preparando…')?.disabled).toBe(true);
    button('Preparando…')?.click();
    expect(prepare).toHaveBeenCalledTimes(1);
    release([]);
  });

  it('con tarjetas, entrega la sesión con su origen y navega al repaso', async () => {
    const cards = [aCard({ id: 'k1' })];
    const { button, update } = await render(async () => cards);

    button('Estudiar este capítulo')?.click();
    await update();

    expect(TestBed.inject(StudyHandoffService).take()).toEqual({ cards, source: SOURCE });
    expect(TestBed.inject(Router).url).toBe('/repaso');
  });

  it('sin tarjetas listas, dice que está al día y no navega', async () => {
    const { element, button, update } = await render(async () => []);

    button('Estudiar este capítulo')?.click();
    await update();

    expect(element.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Estás al día con este capítulo. No hay tarjetas para repasar ahora.',
    );
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('si la preparación falla: error con Reintentar, nunca "al día", y se registra', async () => {
    const failure = new Error('offline');
    const prepare = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce([]);
    const { element, button, update, logger } = await render(prepare);

    button('Estudiar este capítulo')?.click();
    await update();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo preparar la sesión. Inténtalo de nuevo.',
    );
    expect(element.textContent).not.toContain('Estás al día');
    expect(logger.entries.at(-1)?.cause).toBe(failure);

    button('Reintentar')?.click();
    await update();
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('primario en acento; secundario con borde', async () => {
    const primary = await render(async () => []);
    expect(primary.button('Estudiar este capítulo')?.classList).toContain('bg-accent');
    TestBed.resetTestingModule();

    const secondary = await render(async () => [], 'secondary');
    expect(secondary.button('Estudiar este capítulo')?.classList).toContain('border-glass-border');
    expect(secondary.button('Estudiar este capítulo')?.classList).not.toContain('bg-accent');
  });
});
