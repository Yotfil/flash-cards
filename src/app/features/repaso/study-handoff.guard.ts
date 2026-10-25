import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { StudyHandoffService } from '@services/queue/study-handoff.service';

/**
 * La sesión de repaso solo se abre con una lista entregada. Sin ella (recarga del navegador, URL
 * directa o "atrás" tras terminar) vuelve a Hoy en vez de pintar una sesión vacía. Solo mira la
 * bandeja: la pantalla la consume al arrancar.
 */
export const studyHandoffGuard: CanActivateFn = () =>
  inject(StudyHandoffService).prepared() !== null || inject(Router).createUrlTree(['/hoy']);
