import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../core/request.service';
import { AppUser } from '../../core/session.service';

@Component({
  selector: 'app-pendientes',
  templateUrl: './pendientes.component.html',
  styleUrls: ['./pendientes.component.css'],
})
export class PendientesComponent implements OnInit {
  users: AppUser[] = [];
  error = '';
  message = '';

  constructor(private requests: RequestService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.requests.getPendingUsers().subscribe({
      next: (res) => {
        this.users = res.users || [];
      },
      error: (err) => {
        this.error = err?.error?.detailed_message || 'No se pudieron cargar.';
      },
    });
  }

  approve(u: AppUser): void {
    this.requests.approveUser(u.id).subscribe({
      next: () => {
        this.message = u.nombre + ' aprobado.';
        this.load();
      },
      error: (err) => {
        this.error = err?.error?.detailed_message || 'Error al aprobar.';
      },
    });
  }

  reject(u: AppUser): void {
    this.requests.rejectUser(u.id).subscribe({
      next: () => {
        this.message = u.nombre + ' rechazado.';
        this.load();
      },
      error: (err) => {
        this.error = err?.error?.detailed_message || 'Error al rechazar.';
      },
    });
  }
}
