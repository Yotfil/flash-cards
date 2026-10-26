import { TestBed } from '@angular/core/testing';

import { UnexpectedErrorNotice } from './unexpected-error-notice.service';

describe('UnexpectedErrorNotice', () => {
  it('empieza oculto; un fallo lo muestra y varios seguidos siguen siendo un aviso', () => {
    const notice = TestBed.inject(UnexpectedErrorNotice);
    expect(notice.visible()).toBe(false);

    notice.report();
    notice.report();
    notice.report();

    expect(notice.visible()).toBe(true);
  });

  it('cerrarlo lo oculta hasta el próximo fallo', () => {
    const notice = TestBed.inject(UnexpectedErrorNotice);
    notice.report();

    notice.dismiss();
    expect(notice.visible()).toBe(false);

    notice.report();
    expect(notice.visible()).toBe(true);
  });
});
