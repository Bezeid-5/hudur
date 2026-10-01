import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Attendance, AttendanceService } from '../../../core/attendance.service';
import { Activity, ActivityService } from '../../../core/activity.service';

const integerValidator: ValidatorFn = (control) =>
  Number.isInteger(control.value) ? null : { integer: true };

@Component({
  selector: 'app-pointage',
  imports: [ReactiveFormsModule],
  templateUrl: './pointage.component.html',
  styleUrl: './pointage.component.css'
})
export class PointageComponent {
  private readonly authService = inject(AuthService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly activityService = inject(ActivityService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly sessions = this.attendanceService.todaySessions;
  readonly activities = this.activityService.activities;
  readonly openSession = this.attendanceService.openSession;
  readonly loading = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly error = computed(() => this.actionError() ?? this.attendanceService.error());
  readonly activityError = computed(() => this.activityActionError() ?? this.activityService.error());
  readonly activityActionError = signal<string | null>(null);
  readonly selectedSessionId = signal<string | null>(null);
  readonly selectedSession = computed(() => this.sessions().find((session) => session.id === this.selectedSessionId()));
  readonly activityLoading = signal(false);
  readonly activityForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    durationMinutes: [0, [Validators.required, integerValidator, Validators.min(1), Validators.max(1440)]],
    description: ['', Validators.maxLength(500)],
  });
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

  selectSession(sessionId: string): void {
    this.activityActionError.set(null);
    this.selectedSessionId.set(sessionId);
  }

  activitiesFor(sessionId: string): Activity[] {
    return this.activities().filter((activity) => activity.attendanceId === sessionId);
  }

  totalActivityMinutes(sessionId: string): number {
    return this.activitiesFor(sessionId)
      .reduce((total, activity) => total + activity.durationMinutes, 0);
  }

  async addActivity(): Promise<void> {
    const session = this.selectedSession();
    if (this.activityForm.invalid || !session) {
      this.activityForm.markAllAsTouched();
      return;
    }

    this.activityActionError.set(null);
    this.activityLoading.set(true);
    try {
      const { title, durationMinutes, description } = this.activityForm.getRawValue();
      await this.activityService.createActivity(session.id, title, durationMinutes, description);
      this.activityForm.reset({ title: '', durationMinutes: 0, description: '' });
    } catch {
      this.activityActionError.set('Impossible d’ajouter l’activité. Vérifiez votre connexion et réessayez.');
    } finally {
      this.activityLoading.set(false);
    }
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
