import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../core/request.service';
import { SessionService, AppUser } from '../../core/session.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent implements OnInit {
  form = {
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    emergenciaNombre: '',
    emergenciaTelefono: '',
    password: '',
  };
  message = '';
  error = '';
  saving = false;

  constructor(private requests: RequestService, private session: SessionService) {}

  ngOnInit(): void {
    const u = this.session.getUser();
    if (u) this.fill(u);
    this.requests.getMe().subscribe({
      next: (res) => {
        this.session.updateUser(res.user);
        this.fill(res.user);
      },
    });
  }

  fill(u: AppUser): void {
    this.form.nombre = u.nombre || '';
    this.form.apellidos = u.apellidos || '';
    this.form.telefono = u.telefono || '';
    this.form.email = u.email || '';
    this.form.emergenciaNombre = u.emergenciaNombre || '';
    this.form.emergenciaTelefono = u.emergenciaTelefono || '';
  }

  guardar(): void {
    this.message = '';
    this.error = '';
    this.saving = true;
    const payload: Record<string, unknown> = {
      nombre: this.form.nombre,
      apellidos: this.form.apellidos,
      telefono: this.form.telefono,
      email: this.form.email,
      emergenciaNombre: this.form.emergenciaNombre,
      emergenciaTelefono: this.form.emergenciaTelefono,
    };
    if (this.form.password) {
      payload['password'] = this.form.password;
    }
    this.requests.putMe(payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.session.updateUser(res.user);
        this.form.password = '';
        this.message = 'Perfil actualizado.';
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.detailed_message || 'No se pudo guardar.';
      },
    });
  }
}
