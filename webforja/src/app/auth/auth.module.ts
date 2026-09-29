import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { VerifyComponent } from './verify/verify.component';

@NgModule({
  declarations: [LoginComponent, RegisterComponent, VerifyComponent],
  imports: [CommonModule, FormsModule, RouterModule],
  exports: [LoginComponent, RegisterComponent, VerifyComponent],
})
export class AuthModule {}
