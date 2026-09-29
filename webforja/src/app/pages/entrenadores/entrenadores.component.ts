import { Component } from '@angular/core';
import { RequestService } from '../../core/request.service';

@Component({
  selector: 'app-entrenadores',
  templateUrl: './entrenadores.component.html',
  styleUrls: ['./entrenadores.component.css'],
})
export class EntrenadoresComponent {
  form = {
    usuario: '',
    password: '',
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
  };
  message = '';
  error = '';

  constructor(private requests: RequestService) {}

  crear(): void {
    this.message = '';
    this.error = '';
    this.requests.createCoach({ ...this.form }).subscribe({
      next: () => {
        this.message = 'Entrenador creado.';
        this.form = {
          usuario: '',
          password: '',
          nombre: '',
          apellidos: '',
          email: '',
          telefono: '',
        };
      },
      error: (err) => {
        this.error = err?.error?.detailed_message || 'No se pudo crear.';
      },
    });
  }
}
