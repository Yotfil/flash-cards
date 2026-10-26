import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { PracticeAiHandoffService } from '@services/practice-ai/practice-ai-handoff.service';

/**
 * La práctica de un paquete solo se abre con lo que se le entregó. Sin ello (recarga, URL directa
 * o "atrás" tras salir) vuelve a la Biblioteca: nunca se retoma una práctica anterior. Solo mira
 * la bandeja: la pantalla la consume al arrancar.
 */
export const practiceAiHandoffGuard: CanActivateFn = () =>
  inject(PracticeAiHandoffService).prepared() !== null ||
  inject(Router).createUrlTree(['/biblioteca']);
