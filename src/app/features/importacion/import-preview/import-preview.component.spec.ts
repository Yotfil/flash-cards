import { TestBed } from '@angular/core/testing';

import type { ImportPreview } from '@services/import/import.service';
import { parseImportText } from '@services/import/parse-import-text';

import { ImportPreviewComponent } from './import-preview.component';

function preview(text: string, repeatedCount = 0): ImportPreview {
  return { parse: parseImportText(text, 'Mi libro'), repeatedCount };
}

function render(value: ImportPreview, showChapters = true) {
  const fixture = TestBed.createComponent(ImportPreviewComponent);
  fixture.componentRef.setInput('preview', value);
  fixture.componentRef.setInput('showChapters', showChapters);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const FOUR_IN_TWO = ['# A', 'a | b', 'c | d', '# B', 'e | f', 'g | h'].join('\n');

describe('ImportPreviewComponent', () => {
  it('cuenta capítulos, tarjetas y repetidas en una región que se anuncia', () => {
    const element = render(preview(FOUR_IN_TWO, 1));

    const counts = element.querySelector('[aria-live="polite"]');
    expect(counts?.textContent).toContain('2 capítulos · 4 tarjetas · 1 repetida');
    expect(element.textContent).toContain(
      'Se importarán igual. Las verás marcadas como repetidas.',
    );
  });

  it('sin repetidas no hay ni conteo ni frase', () => {
    const element = render(preview(FOUR_IN_TWO));

    expect(element.textContent).not.toContain('repetida');
    expect(element.textContent).not.toContain('Se importarán igual');
  });

  it('en un capítulo no cuenta capítulos', () => {
    expect(render(preview('a | b'), false).textContent).not.toContain('capítulo');
  });

  it('lista las líneas omitidas con su número, su motivo y un icono', () => {
    const element = render(preview(['a | b', 'sin separador', '| vacío'].join('\n')));

    expect(element.textContent).toContain('2 líneas se omitirán:');
    const items = Array.from(element.querySelectorAll('li'));
    expect(items.map((item) => item.textContent?.trim())).toEqual([
      'Línea 2: Línea sin separador ("|" o tabulador).',
      'Línea 3: Anverso o reverso vacío.',
    ]);
    expect(items.every((item) => item.querySelector('app-icon[data-icon="alert"]'))).toBe(true);
  });

  it('sin errores no hay lista; la superficie es sólida', () => {
    const element = render(preview('a | b'));

    expect(element.querySelector('ul')).toBeNull();
    expect(element.firstElementChild?.classList).toContain('bg-surface');
  });
});
