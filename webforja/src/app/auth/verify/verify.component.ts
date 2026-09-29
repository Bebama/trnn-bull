import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RequestService } from '../../core/request.service';

@Component({
  selector: 'app-verify',
  templateUrl: './verify.component.html',
  styleUrls: ['./verify.component.css'],
})
export class VerifyComponent implements OnInit {
  email = '';
  code = '';
  hint = '';
  error = '';
  success = '';
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private requests: RequestService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.email = params.get('email') || '';
      this.hint = params.get('hint') || '';
      const code = params.get('code') || '';
      if (code) {
        this.code = code;
      }
    });
  }

  verificar(): void {
    this.error = '';
    this.success = '';
    if (!this.email || !this.code) {
      this.error = 'Introduce el email y el código.';
      return;
    }
    this.loading = true;
    this.requests.postVerifyEmail(this.email.trim(), this.code.trim()).subscribe({
      next: (data) => {
        this.loading = false;
        this.success =
          data?.message ||
          'Email verificado. Tu cuenta está pendiente de validación del box.';
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detailed_message || 'Código incorrecto.';
      },
    });
  }

  irLogin(): void {
    this.router.navigate(['/login']);
  }
}
