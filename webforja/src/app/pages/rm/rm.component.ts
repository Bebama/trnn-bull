import { Component, OnInit } from '@angular/core';
import { LIFT_LABELS, RM_PERCENTS, RequestService } from '../../core/request.service';
import { SessionService, AppUser } from '../../core/session.service';

@Component({
  selector: 'app-rm',
  templateUrl: './rm.component.html',
  styleUrls: ['./rm.component.css'],
})
export class RmComponent implements OnInit {
  lifts: string[] = Object.keys(LIFT_LABELS);
  labels = LIFT_LABELS;
  percents = RM_PERCENTS;
  rms: Record<string, number | null> = {};
  athletes: AppUser[] = [];
  selectedUserId = '';
  isStaff = false;
  message = '';
  error = '';
  saving = false;

  constructor(private requests: RequestService, private session: SessionService) {}

  ngOnInit(): void {
    this.isStaff = this.session.isStaff();
    this.selectedUserId = this.session.getUser()?.id || '';
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
    this.requests.getRm(this.isStaff ? this.selectedUserId || undefined : undefined).subscribe({
      next: (res) => {
        this.lifts = res.lifts?.length ? res.lifts : this.lifts;
        this.rms = { ...res.rms };
        this.selectedUserId = res.userId;
      },
      error: (err) => {
        this.error = err?.error?.detailed_message || 'No se pudieron cargar los RM.';
      },
    });
  }

  onAthleteChange(): void {
    this.load();
  }

  pct(rm: number | null | undefined, p: number): string {
    if (rm == null || isNaN(Number(rm)) || Number(rm) <= 0) return '—';
    const raw = (Number(rm) * p) / 100;
    const rounded = Math.round(raw * 2) / 2;
    return rounded.toFixed(rounded % 1 === 0 ? 0 : 1) + ' kg';
  }

  save(): void {
    this.saving = true;
    this.message = '';
    this.error = '';
    this.requests.putRm(this.rms, this.isStaff ? this.selectedUserId : undefined).subscribe({
      next: (res) => {
        this.saving = false;
        this.rms = { ...res.rms };
        this.message = 'RM guardados.';
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.detailed_message || 'No se pudo guardar.';
      },
    });
  }
}
