import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Attendance, AttendanceService } from '../../../core/attendance.service';

@Component({
  selector: 'app-pointage',
  imports: [],
  templateUrl: './pointage.component.html',
  styleUrl: './pointage.component.css'
})
export class PointageComponent {
  private readonly authService = inject(AuthService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly sessions = this.attendanceService.todaySessions;
  readonly openSession = this.attendanceService.openSession;
  readonly loading = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly error = computed(() => this.actionError() ?? this.attendanceService.error());
  readonly now = signal(Date.now());

  constructor() {
    const timer = window.setInterval(() => this.now.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => window.clearInterval(timer));
  }

  async checkIn(): Promise<void> {
    await this.runAction(() => this.attendanceService.checkIn());
  }

  async checkOut(): Promise<void> {
    await this.runAction(() => this.attendanceService.checkOut());
  }

  formatTime(timestamp: Attendance['checkIn']): string {
    return timestamp?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) ?? '--:--';
  }

  formatDuration(session: Attendance): string {
    if (!session.checkIn) {
      return 'En attente';
    }

    const end = session.checkOut?.toMillis() ?? this.now();
    const minutes = Math.max(0, Math.floor((end - session.checkIn.toMillis()) / 60_000));
    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    this.actionError.set(null);
    this.loading.set(true);
    try {
      await action();
    } catch {
      this.actionError.set('Le pointage a échoué. Vérifiez votre connexion et réessayez.');
    } finally {
      this.loading.set(false);
    }
  }

}
