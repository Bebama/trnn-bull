import { Component } from '@angular/core';
import { SessionService } from '../../core/session.service';

@Component({
  selector: 'app-home-dash',
  templateUrl: './home-dash.component.html',
  styleUrls: ['./home-dash.component.css'],
})
export class HomeDashComponent {
  constructor(public session: SessionService) {}
}
