import { Component } from '@angular/core';

// Componente raíz del esqueleto. Las pantallas y la navegación llegan con `navegacion-y-shell`;
// hasta entonces solo pinta el nombre del producto.
@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
