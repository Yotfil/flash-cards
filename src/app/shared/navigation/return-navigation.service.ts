import { Location } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

// Salir de una pantalla completa (repaso, práctica, práctica con IA) sin dejarla en el historial.
// Si se llegó desde el destino, se regresa con "atrás": el destino recupera su entrada y el
// siguiente "atrás" lleva a lo anterior. Si se llegó desde otra pantalla, la pantalla completa se
// reemplaza por el destino. Así ningún "atrás" posterior cae en una pantalla vacía o repetida.
@Injectable({ providedIn: 'root' })
export class ReturnNavigation {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  leaveTo(commands: readonly unknown[]): void {
    const destination = this.router.createUrlTree([...commands]);
    if (this.cameFrom(this.router.serializeUrl(destination))) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl(destination, { replaceUrl: true });
  }

  /** ¿La pantalla actual se abrió desde `url`? (la navegación anterior a la que trajo aquí). */
  private cameFrom(url: string): boolean {
    const previous = this.router.lastSuccessfulNavigation()?.previousNavigation?.finalUrl;
    return previous !== undefined && this.router.serializeUrl(previous) === url;
  }
}
