import {
  cardGoneMessage,
  rejectedAfterFinishLabel,
  rejectedGradeMessage,
  remainingLabel,
  reviewedCardsLabel,
} from './repaso.copy';

describe('textos de la sesión de repaso', () => {
  it('el contador de lo que queda, con plural real', () => {
    expect(remainingLabel(5)).toBe('Quedan 5');
    expect(remainingLabel(1)).toBe('Queda 1');
  });

  it('el cierre cuenta las tarjetas distintas', () => {
    expect(reviewedCardsLabel(20)).toBe('Repasaste 20 tarjetas.');
    expect(reviewedCardsLabel(1)).toBe('Repasaste 1 tarjeta.');
  });

  it('una tarjeta borrada en otro dispositivo se nombra y se dice que no se guardó', () => {
    expect(cardGoneMessage('to give up')).toBe(
      'La tarjeta «to give up» se borró en otro dispositivo; su calificación no se guardó.',
    );
  });

  it('un guardado rechazado nombra la tarjeta', () => {
    expect(rejectedGradeMessage('to give up')).toBe(
      'No se guardó tu calificación de «to give up». Vuelve a calificarla.',
    );
  });

  it('los rechazos tras el cierre, con plural real', () => {
    expect(rejectedAfterFinishLabel(1)).toBe(
      '1 calificación no se guardó. Esa tarjeta sigue pendiente.',
    );
    expect(rejectedAfterFinishLabel(3)).toBe(
      '3 calificaciones no se guardaron. Esas tarjetas siguen pendientes.',
    );
  });
});
