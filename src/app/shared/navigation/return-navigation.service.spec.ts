import { Location } from '@angular/common';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ReturnNavigation } from './return-navigation.service';

@Component({ template: '' })
class BlankPageComponent {}

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

/** Recorre las URL en orden, como lo haría el usuario, y deja listo el "atrás". */
async function visit(...urls: string[]) {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: '**', component: BlankPageComponent }])],
  });
  const harness = await RouterTestingHarness.create();
  // Lo hace el arranque de la app; sin esto el router de las pruebas no oye el "atrás".
  TestBed.inject(Router).setUpLocationChangeListener();
  for (const url of urls) {
    await harness.navigateByUrl(url);
  }
  const settle = async () => {
    await wait(60);
    await TestBed.inject(ApplicationRef).whenStable();
  };
  const back = async () => {
    TestBed.inject(Location).back();
    await settle();
  };
  return {
    service: TestBed.inject(ReturnNavigation),
    settle,
    back,
    url: () => TestBed.inject(Router).url,
  };
}

describe('ReturnNavigation', () => {
  it('si se llegó desde el destino, regresa con el historial', async () => {
    const { service, settle, back, url } = await visit('/libro', '/capitulo', '/practicar');

    service.leaveTo(['/capitulo']);
    await settle();
    expect(url()).toBe('/capitulo');

    await back();
    expect(url()).toBe('/libro');
  });

  it('si se llegó desde otra pantalla, reemplaza la actual por el destino', async () => {
    const { service, settle, back, url } = await visit('/hoy', '/capitulo', '/repaso');

    service.leaveTo(['/hoy']);
    await settle();
    expect(url()).toBe('/hoy');

    await back();
    expect(url()).toBe('/capitulo');
  });
});
