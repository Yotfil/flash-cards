import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

import { ServiceWorkerUpdateAdapter } from './service-worker-update.adapter';

const READY: VersionEvent = {
  type: 'VERSION_READY',
  currentVersion: { hash: 'vieja' },
  latestVersion: { hash: 'nueva' },
};
const DETECTED: VersionEvent = { type: 'VERSION_DETECTED', version: { hash: 'nueva' } };

describe('ServiceWorkerUpdateAdapter', () => {
  function create(swUpdate: Partial<SwUpdate> | null) {
    TestBed.configureTestingModule({
      providers: [
        ServiceWorkerUpdateAdapter,
        ...(swUpdate ? [{ provide: SwUpdate, useValue: swUpdate }] : []),
      ],
    });
    return TestBed.inject(ServiceWorkerUpdateAdapter);
  }

  it('marca lista la versión cuando el trabajador de servicio termina de descargarla', () => {
    const versionUpdates = new Subject<VersionEvent>();
    const adapter = create({ isEnabled: true, versionUpdates });

    versionUpdates.next(DETECTED);
    expect(adapter.updateReady()).toBe(false);

    versionUpdates.next(READY);
    expect(adapter.updateReady()).toBe(true);
  });

  it('con el trabajador de servicio inactivo (desarrollo), nunca hay versión lista', () => {
    const versionUpdates = new Subject<VersionEvent>();
    const adapter = create({ isEnabled: false, versionUpdates });

    versionUpdates.next(READY);

    expect(adapter.updateReady()).toBe(false);
  });

  it('sin trabajador de servicio registrado, nunca hay versión lista', () => {
    expect(create(null).updateReady()).toBe(false);
  });
});
