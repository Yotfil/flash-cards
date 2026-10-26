import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { UnexpectedErrorNoticeComponent } from '@features/shell/unexpected-error-notice/unexpected-error-notice.component';

// Componente raíz: aloja el router (el caparazón y las pantallas completas son rutas) y el aviso de
// fallo no previsto, que así se ve en cualquier pantalla, también en el repaso y la práctica.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UnexpectedErrorNoticeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
