import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ShellComponent } from './shell.component';
import { HomeDashComponent } from '../pages/home-dash/home-dash.component';
import { SettingsComponent } from '../pages/settings/settings.component';
import { LogrosComponent } from '../pages/logros/logros.component';
import { RmComponent } from '../pages/rm/rm.component';
import { CalendarioComponent } from '../pages/calendario/calendario.component';
import { PendientesComponent } from '../pages/pendientes/pendientes.component';
import { EntrenadoresComponent } from '../pages/entrenadores/entrenadores.component';

const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', component: HomeDashComponent, title: 'Inicio · TRNN BULL' },
      { path: 'ajustes', component: SettingsComponent, title: 'Ajustes · TRNN BULL' },
      { path: 'logros', component: LogrosComponent, title: 'Logros · TRNN BULL' },
      { path: 'rm', component: RmComponent, title: 'RM · TRNN BULL' },
      { path: 'calendario', component: CalendarioComponent, title: 'Calendario · TRNN BULL' },
      { path: 'pendientes', component: PendientesComponent, title: 'Pendientes · TRNN BULL' },
      { path: 'entrenadores', component: EntrenadoresComponent, title: 'Entrenadores · TRNN BULL' },
    ],
  },
];

@NgModule({
  declarations: [
    ShellComponent,
    HomeDashComponent,
    SettingsComponent,
    LogrosComponent,
    RmComponent,
    CalendarioComponent,
    PendientesComponent,
    EntrenadoresComponent,
  ],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)],
})
export class ShellModule {}
