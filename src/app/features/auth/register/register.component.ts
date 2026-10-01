import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.loading.set(true);
    try {
      const { name, email, password } = this.form.getRawValue();
      await this.authService.register(name, email, password);
      await this.router.navigateByUrl('/pointage');
    } catch (error: unknown) {
      this.error.set(
        this.isEmailAlreadyInUse(error)
          ? 'Cette adresse email est déjà utilisée.'
          : 'Impossible de créer le compte.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  private isEmailAlreadyInUse(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error
      && error.code === 'auth/email-already-in-use';
  }

}
