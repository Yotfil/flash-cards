import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ImportService } from '@services/import';
import { ImportarLibroComponent } from './importar-libro.component';

describe('ImportarLibroComponent', () => {
  it('se crea', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ImportService, useValue: {} }],
    });

    const fixture = TestBed.createComponent(ImportarLibroComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
