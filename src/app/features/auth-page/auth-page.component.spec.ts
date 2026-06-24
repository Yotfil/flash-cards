import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { AuthService } from '@services/auth.service';
import { AuthPageComponent } from './auth-page.component';

describe('AuthPageComponent', () => {
  it('se crea', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: signal(false) } },
      ],
    });

    const fixture = TestBed.createComponent(AuthPageComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
