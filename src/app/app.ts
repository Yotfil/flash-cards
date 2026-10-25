import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Componente raíz: solo aloja el router. El caparazón y las pantallas completas son rutas.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
