import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../core/request.service';
import { SessionService, AppUser, Logro } from '../../core/session.service';

@Component({
  selector: 'app-logros',
  templateUrl: './logros.component.html',
  styleUrls: ['./logros.component.css'],
})
export class LogrosComponent implements OnInit {
  logros: Logro[] = [];
  athletes: AppUser[] = [];
  selectedUserId = '';
  isStaff = false;
  nuevo = { nombre: '', descripcion: '' };
  error = '';
  message = '';

  constructor(private requests: RequestService, private session: SessionService) {}

  ngOnInit(): void {
    this.isStaff = this.session.isStaff();
    const me = this.session.getUser();
    this.selectedUserId = me?.id || '';
    if (this.isStaff) {
      this.requests.getAthletes().subscribe({
        next: (res) => {
          this.athletes = res.users || [];
          this.load();
        },
        error: () => this.load(),
      });
    } else {
      this.load();
    }
  }

  load(): void {
    this.requests.getLogros(this.isStaff ? this.selectedUserId : undefined).subscribe({
      next: (res) => {
        this.logros = res.logros || [];
      },
      error: (err) => {
        this.error = err?.error?.detailed_message || 'No se pudieron cargar los logros.';
      },
    });
  }

  onAthleteChange(): void {
    this.load();
  }

  add(): void {
    this.error = '';
    this.message = '';
    if (!this.selectedUserId || !this.nuevo.nombre.trim()) {
      this.error = 'Elige atleta y nombre del logro.';
      return;
    }
    this.requests
      .addLogro({
        userId: this.selectedUserId,
        nombre: this.nuevo.nombre.trim(),
        descripcion: this.nuevo.descripcion.trim(),
      })
      .subscribe({
        next: (res) => {
          this.logros = res.logros || [];
          this.nuevo = { nombre: '', descripcion: '' };
          this.message = 'Logro añadido.';
        },
        error: (err) => {
          this.error = err?.error?.detailed_message || 'No se pudo añadir.';
        },
      });
  }

  remove(logro: Logro): void {
    this.requests.deleteLogro(logro.id, this.selectedUserId).subscribe({
      next: (res) => {
        this.logros = res.logros || [];
      },
      error: (err) => {
        this.error = err?.error?.detailed_message || 'No se pudo eliminar.';
      },
    });
  }
}
