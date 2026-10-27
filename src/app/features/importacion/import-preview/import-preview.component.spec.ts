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

const omittedItems = (element: HTMLElement) =>
  Array.from(element.querySelectorAll('[data-omitted-list] li'));
const chapterItems = (element: HTMLElement) =>
  Array.from(element.querySelectorAll('[data-chapter-list] li')).map((item) =>
    item.textContent?.trim(),
  );
const chapters = (count: number) =>
  Array.from({ length: count }, (_, index) => `# Unidad ${index + 1}\na | b`).join('\n');

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
    const items = omittedItems(element);
    expect(items.map((item) => item.textContent?.trim())).toEqual([
      'Línea 2: Línea sin separador ("|" o tabulador).',
      'Línea 3: Anverso o reverso vacío.',
    ]);
    expect(items.every((item) => item.querySelector('app-icon[data-icon="alert"]'))).toBe(true);
  });

  it('sin errores no hay lista; la superficie es sólida', () => {
    const element = render(preview('a | b'));

    expect(element.querySelector('[data-omitted-list]')).toBeNull();
    expect(element.firstElementChild?.classList).toContain('bg-surface');
  });

  it('al importar un libro nombra cada capítulo con su número de tarjetas', () => {
    const element = render(preview(['# Unidad 1', 'a | b', 'c | d', '# Unidad 2'].join('\n')));

    expect(element.textContent).toContain('Tarjetas por capítulo');
    expect(chapterItems(element)).toEqual(['Unidad 1 · 2', 'Unidad 2 · 0']);
  });

  it('un "#" de más se ve: la tarjeta que se volvió capítulo sale con su nombre', () => {
    const text = ['# Preprocesador', '#include | incluye un archivo', 'pragma | directiva'];
    const element = render(preview(text.join('\n')));

    expect(chapterItems(element)).toEqual([
      'Preprocesador · 0',
      'include | incluye un archivo · 1',
    ]);
  });

  it('con hasta 5 capítulos la lista se ve; con más, va plegada', () => {
    const five = render(preview(chapters(5)));
    expect(five.querySelector('details')).toBeNull();
    expect(chapterItems(five)).toHaveLength(5);

    const twelve = render(preview(chapters(12)));
    const folded = twelve.querySelector('details');
    expect(folded?.open).toBe(false);
    expect(folded?.querySelector('summary')?.textContent?.trim()).toBe('Tarjetas por capítulo');
    expect(chapterItems(twelve)).toHaveLength(12);
  });

  it('en un capítulo no nombra capítulos', () => {
    const element = render(preview(['# A', 'a | b'].join('\n')), false);

    expect(element.querySelector('[data-chapter-list]')).toBeNull();
  });

  it('un archivo equivocado de miles de líneas: el conteo exacto y solo las 100 primeras', () => {
    const lines = Array.from({ length: 20000 }, (_, index) => `fila ${index + 1}, sin separador`);
    const element = render(preview(lines.join('\n')));

    expect(element.textContent).toContain('20000 líneas se omitirán:');
    const items = omittedItems(element);
    expect(items).toHaveLength(101);
    expect(items[0]?.textContent?.trim()).toBe('Línea 1: Línea sin separador ("|" o tabulador).');
    expect(items[99]?.textContent?.trim()).toBe(
      'Línea 100: Línea sin separador ("|" o tabulador).',
    );
    expect(items.slice(0, 100).every((item) => item.querySelector('app-icon'))).toBe(true);
    expect(items[100]?.textContent?.trim()).toBe('y 19900 más');
  });
});
