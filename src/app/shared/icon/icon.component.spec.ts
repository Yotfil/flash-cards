import { TestBed } from '@angular/core/testing';

import { ICON_NAMES, IconComponent, type IconName } from './icon.component';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

function render(name: IconName, size?: 'sm' | 'md'): SVGSVGElement {
  const fixture = TestBed.createComponent(IconComponent);
  fixture.componentRef.setInput('name', name);
  if (size) {
    fixture.componentRef.setInput('size', size);
  }
  fixture.detectChanges();
  const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
  if (!svg) {
    throw new Error(`El icono ${name} no pintó un <svg>`);
  }
  return svg;
}

describe('IconComponent', () => {
  it('el catálogo tiene los diez iconos del caparazón (y crece con las pantallas)', () => {
    expect(ICON_NAMES).toEqual(
      expect.arrayContaining([
        'alert',
        'books',
        'brain',
        'calendar',
        'chart',
        'check',
        'offline',
        'sliders',
        'spark',
        'x',
      ]),
    );
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
  });

  it.each(ICON_NAMES)('%s es un trazo decorativo que hereda el color del texto', (name) => {
    const svg = render(name);

    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    const shape = svg.querySelector('path, rect, circle');
    expect(shape).not.toBeNull();
    expect(shape?.namespaceURI).toBe(SVG_NAMESPACE);
  });

  it('expone su nombre en el host para reconocerlo en el DOM', () => {
    const fixture = TestBed.createComponent(IconComponent);
    fixture.componentRef.setInput('name', 'spark');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).getAttribute('data-icon')).toBe('spark');
  });

  it('es mediano por defecto y admite el tamaño pequeño', () => {
    expect(render('check').getAttribute('class')).toContain('size-5');
    expect(render('check', 'sm').getAttribute('class')).toContain('size-4');
  });
});
