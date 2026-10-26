import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Logger } from '@domain/ports/logger.port';
import { FakeLogger } from '@testing/fake-logger';

import { StudyLaunchButtonComponent } from './study-launch-button.component';

@Component({ template: '' })
class BlankPageComponent {}

async function render(
  prepare: () => Promise<number>,
  variant: 'primary' | 'secondary' = 'primary',
  destination: string[] = ['/repaso'],
) {
  const logger = new FakeLogger();
  const discard = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'repaso', component: BlankPageComponent },
        { path: 'practicar', component: BlankPageComponent },
        { path: 'hoy', component: BlankPageComponent },
      ]),
      { provide: Logger, useValue: logger },
    ],
  });
  const fixture = TestBed.createComponent(StudyLaunchButtonComponent);
  fixture.componentRef.setInput('label', 'Estudiar este capítulo');
  fixture.componentRef.setInput('variant', variant);
  fixture.componentRef.setInput('prepare', prepare);
  fixture.componentRef.setInput('destination', destination);
  fixture.componentRef.setInput('discard', discard);
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
  return { fixture, element, update, button, logger, discard };
}

describe('StudyLaunchButtonComponent', () => {
  it('mientras prepara dice "Preparando…", se deshabilita y un segundo toque no prepara otra vez', async () => {
    let release!: (count: number) => void;
    const prepare = vi.fn(() => new Promise<number>((resolve) => (release = resolve)));
    const { button, update } = await render(prepare);

    button('Estudiar este capítulo')?.click();
    button('Estudiar este capítulo')?.click();
    await update();

    expect(button('Preparando…')?.disabled).toBe(true);
    button('Preparando…')?.click();
    expect(prepare).toHaveBeenCalledTimes(1);
    release(0);
  });

  it('si quien prepara entregó algo, navega a su destino', async () => {
    const { button, update } = await render(async () => 3);

    button('Estudiar este capítulo')?.click();
    await update();

    expect(TestBed.inject(Router).url).toBe('/repaso');
  });

  it('el destino es configurable (la práctica)', async () => {
    const { button, update } = await render(async () => 10, 'secondary', ['/practicar']);

    button('Estudiar este capítulo')?.click();
    await update();

    expect(TestBed.inject(Router).url).toBe('/practicar');
  });

  it('sin tarjetas listas, dice que está al día y no navega', async () => {
    const { element, button, update } = await render(async () => 0);

    button('Estudiar este capítulo')?.click();
    await update();

    expect(element.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Estás al día con este capítulo. No hay tarjetas para repasar ahora.',
    );
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('si la preparación falla: error con Reintentar, nunca "al día", y se registra', async () => {
    const failure = new Error('offline');
    const prepare = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(0);
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

  it('si mientras prepara el usuario se va a otra pantalla, al terminar no navega y vacía la bandeja', async () => {
    // "Practicar" tarda; Ada se cansa, se va a Hoy y empieza a repasar.
    let release!: (count: number) => void;
    const { button, update, discard } = await render(
      () => new Promise<number>((resolve) => (release = resolve)),
      'secondary',
      ['/practicar'],
    );
    button('Estudiar este capítulo')?.click();
    await update();

    await TestBed.inject(Router).navigateByUrl('/hoy');
    release(10);
    await update();

    expect(TestBed.inject(Router).url).toBe('/hoy');
    expect(discard).toHaveBeenCalledTimes(1);
  });

  it('si su pantalla ya no está cuando termina de preparar, no navega y vacía la bandeja', async () => {
    let release!: (count: number) => void;
    const { fixture, button, update, discard } = await render(
      () => new Promise<number>((resolve) => (release = resolve)),
    );
    button('Estudiar este capítulo')?.click();
    await update();

    fixture.destroy();
    release(3);
    await new Promise((resolve) => setTimeout(resolve));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(TestBed.inject(Router).url).toBe('/');
    expect(discard).toHaveBeenCalledTimes(1);
  });

  it('si navega a su destino, no vacía la bandeja', async () => {
    const { button, update, discard } = await render(async () => 3);

    button('Estudiar este capítulo')?.click();
    await update();

    expect(TestBed.inject(Router).url).toBe('/repaso');
    expect(discard).not.toHaveBeenCalled();
  });

  it('primario en acento; secundario con borde', async () => {
    const primary = await render(async () => 0);
    expect(primary.button('Estudiar este capítulo')?.classList).toContain('bg-accent');
    TestBed.resetTestingModule();

    const secondary = await render(async () => 0, 'secondary');
    expect(secondary.button('Estudiar este capítulo')?.classList).toContain('border-glass-border');
    expect(secondary.button('Estudiar este capítulo')?.classList).not.toContain('bg-accent');
  });
});
