import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { PracticeHandoffService } from '@services/practice/practice-handoff.service';

/**
 * La práctica solo se abre con un quiz entregado. Sin él (recarga del navegador, URL directa o
 * "atrás" tras salir) vuelve a la Biblioteca en vez de pintar una práctica vacía o una anterior.
 * Solo mira la bandeja: la pantalla la consume al arrancar.
 */
export const practiceHandoffGuard: CanActivateFn = () =>
  inject(PracticeHandoffService).prepared() !== null ||
  inject(Router).createUrlTree(['/biblioteca']);
