import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../core/request.service';
import { SessionService } from '../../core/session.service';

interface DayCell {
  date: string | null;
  dayNum: number | null;
  hasWod: boolean;
}

@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css'],
})
export class CalendarioComponent implements OnInit {
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;
  workouts: Record<string, { title: string; description: string }> = {};
  cells: DayCell[] = [];
  selectedDate: string | null = null;
  editTitle = '';
  editDescription = '';
  isStaff = false;
  message = '';
  error = '';
  weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  constructor(private requests: RequestService, private session: SessionService) {}

  ngOnInit(): void {
    this.isStaff = this.session.isStaff();
    this.load();
  }

  load(): void {
    this.requests.getCalendar(this.year, this.month).subscribe({
      next: (res) => {
        this.workouts = res.workouts || {};
        this.buildCells();
      },
      error: (err) => {
        this.error = err?.error?.detailed_message || 'No se pudo cargar el calendario.';
      },
    });
  }

  buildCells(): void {
    const first = new Date(this.year, this.month - 1, 1);
    let startPad = first.getDay() - 1;
    if (startPad < 0) startPad = 6;
    const daysInMonth = new Date(this.year, this.month, 0).getDate();
    const cells: DayCell[] = [];
    for (let i = 0; i < startPad; i++) {
      cells.push({ date: null, dayNum: null, hasWod: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date =
        this.year +
        '-' +
        String(this.month).padStart(2, '0') +
        '-' +
        String(d).padStart(2, '0');
      cells.push({
        date,
        dayNum: d,
        hasWod: !!(this.workouts[date] && (this.workouts[date].title || this.workouts[date].description)),
      });
    }
    this.cells = cells;
  }

  prevMonth(): void {
    if (this.month === 1) {
      this.month = 12;
      this.year -= 1;
    } else {
      this.month -= 1;
    }
    this.selectedDate = null;
    this.load();
  }

  nextMonth(): void {
    if (this.month === 12) {
      this.month = 1;
      this.year += 1;
    } else {
      this.month += 1;
    }
    this.selectedDate = null;
    this.load();
  }

  openDay(cell: DayCell): void {
    if (!cell.date) return;
    this.selectedDate = cell.date;
    const w = this.workouts[cell.date];
    this.editTitle = w?.title || '';
    this.editDescription = w?.description || '';
    this.message = '';
    this.error = '';
  }

  saveDay(): void {
    if (!this.selectedDate || !this.isStaff) return;
    this.requests
      .putCalendarDay(this.selectedDate, this.editTitle, this.editDescription)
      .subscribe({
        next: (res) => {
          this.workouts[this.selectedDate!] = res.workout;
          this.buildCells();
          this.message = 'WOD guardado.';
        },
        error: (err) => {
          this.error = err?.error?.detailed_message || 'No se pudo guardar.';
        },
      });
  }
}
