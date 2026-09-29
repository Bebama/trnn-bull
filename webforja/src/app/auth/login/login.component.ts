import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../../core/request.service';
import { SessionService } from '../../core/session.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  boxName = 'TRNN BULL CrossFit';
  usuario = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private requests: RequestService,
    private session: SessionService,
    private router: Router
  ) {
    if (this.session.isLoggedIn()) {
      this.router.navigate(['/app']);
    }
  }

  entrar(): void {
    this.error = '';
    if (!this.usuario.trim() || !this.password) {
      this.error = 'Introduce usuario y contraseña.';
      return;
    }
    this.loading = true;
    this.requests.postLogin(this.usuario.trim(), this.password).subscribe({
      next: (data) => {
        this.loading = false;
        if (data && data.access_token && data.user) {
          this.session.setSession(data.access_token, data.user);
          this.router.navigate(['/app']);
        } else {
          this.error = 'No se ha podido iniciar sesión.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.error?.detailed_message ||
          'No se ha podido iniciar sesión. Comprueba tus datos.';
      },
    });
  }

  irRegistro(): void {
    this.router.navigate(['/registro']);
  }
}
