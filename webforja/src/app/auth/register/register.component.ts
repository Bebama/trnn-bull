import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../../core/request.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  form = {
    nombre: '',
    apellidos: '',
    fechaNacimiento: '',
    email: '',
    password: '',
    telefono: '',
    emergenciaNombre: '',
    emergenciaTelefono: '',
    nivel: '',
  };

  niveles = [
    'nunca he hecho CrossFit',
    'algo de experiencia',
    'entreno habitual',
  ];

  error = '';
  loading = false;

  constructor(private requests: RequestService, private router: Router) {}

  enviar(): void {
    this.error = '';
    const f = this.form;
    if (
      !f.nombre ||
      !f.apellidos ||
      !f.fechaNacimiento ||
      !f.email ||
      !f.password ||
      !f.telefono ||
      !f.emergenciaNombre ||
      !f.emergenciaTelefono ||
      !f.nivel
    ) {
      this.error = 'Rellena todos los campos.';
      return;
    }
    this.loading = true;
    this.requests.postRegister({ ...f }).subscribe({
      next: (data) => {
        this.loading = false;
        this.router.navigate(['/verificar'], {
          queryParams: {
            email: f.email,
            hint: data?.devHint || '',
            code: data?.devCode || '',
          },
        });
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.error?.detailed_message || 'No se ha podido completar el registro.';
      },
    });
  }

  volver(): void {
    this.router.navigate(['/login']);
  }
}
