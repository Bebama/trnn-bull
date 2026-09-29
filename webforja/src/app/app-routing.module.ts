import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { VerifyComponent } from './auth/verify/verify.component';
import { AuthGuard } from './core/auth.guard';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent, title: 'Login · TRNN BULL CrossFit' },
  { path: 'registro', component: RegisterComponent, title: 'Registro · TRNN BULL CrossFit' },
  { path: 'verificar', component: VerifyComponent, title: 'Verificación · TRNN BULL CrossFit' },
  {
    path: 'app',
    canActivate: [AuthGuard],
    loadChildren: () => import('./shell/shell.module').then((m) => m.ShellModule),
  },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
