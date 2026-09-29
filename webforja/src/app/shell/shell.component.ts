import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../core/request.service';
import { SessionService } from '../core/session.service';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css'],
})
export class ShellComponent {
  // App shell with left sidebar
  constructor(
    public session: SessionService,
    private requests: RequestService,
    private router: Router
  ) {}

  logout(): void {
    this.requests.postLogout().subscribe({
      next: () => {
        this.session.clear();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.session.clear();
        this.router.navigate(['/login']);
      },
    });
  }
}
