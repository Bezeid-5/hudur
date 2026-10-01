import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { Activity, ActivityService } from '../../../core/activity.service';
import { Attendance } from '../../../core/attendance.service';
import { HistoryService, startOfLocalDay } from '../../../core/history.service';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-historique',
  imports: [RouterLink],
  templateUrl: './historique.component.html',
  styleUrl: './historique.component.css',
})
export class HistoriqueComponent {
  private readonly authService = inject(AuthService);
  private readonly activityService = inject(ActivityService);
  private readonly historyService = inject(HistoryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = this.authService.user;
  readonly selectedDay = signal(startOfLocalDay(new Date()));
  readonly activities = this.activityService.activities;
  readonly error = computed(() => this.historyService.error() ?? this.activityService.error());
  readonly now = signal(Date.now());
  readonly daySessions = toSignal(
    toObservable(this.selectedDay).pipe(switchMap((day) => this.historyService.observeDay(day))),
    { initialValue: [] as Attendance[] }
  );
  readonly weekSessions = toSignal(
    toObservable(this.selectedDay).pipe(switchMap((day) => this.historyService.observeWeek(day))),
    { initialValue: [] as Attendance[] }
  );
  readonly weekDays = computed(() => {
    const monday = this.startOfWeek(this.selectedDay());
    return Array.from({ length: 7 }, (_, index) => this.addDays(monday, index));
  });
  readonly weeklySummary = computed(() => this.weekDays().map((day) => ({
    day,
    minutes: this.weekSessions()
      .filter((session) => this.isSameDay(session.checkIn?.toDate() ?? null, day))
      .reduce((total, session) => total + this.sessionMinutes(session), 0),
  })));
  readonly weeklyTotalMinutes = computed(() => this.weeklySummary()
    .reduce((total, summary) => total + summary.minutes, 0));

  constructor() {
    const timer = window.setInterval(() => this.now.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => window.clearInterval(timer));
  }

  previousDay(): void {
    this.selectedDay.set(this.addDays(this.selectedDay(), -1));
  }

  nextDay(): void {
    if (!this.isToday(this.selectedDay())) {
      this.selectedDay.set(this.addDays(this.selectedDay(), 1));
    }
  }

  today(): void {
    this.selectedDay.set(startOfLocalDay(new Date()));
  }

  isToday(day: Date): boolean {
    return this.isSameDay(day, new Date());
  }

  formatDay(day: Date): string {
    return day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatShortDay(day: Date): string {
    return day.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  }

  formatTime(timestamp: Attendance['checkIn']): string {
    return timestamp?.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) ?? '--:--';
  }

  formatDurationMinutes(minutes: number): string {
    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
  }

  sessionDuration(session: Attendance): string {
    return this.formatDurationMinutes(this.sessionMinutes(session));
  }

  activitiesFor(sessionId: string): Activity[] {
    return this.activities().filter((activity) => activity.attendanceId === sessionId);
  }

  totalActivityMinutes(sessionId: string): number {
    return this.activitiesFor(sessionId).reduce((total, activity) => total + activity.durationMinutes, 0);
  }

  private sessionMinutes(session: Attendance): number {
    if (!session.checkIn) {
      return 0;
    }

    const end = session.checkOut?.toMillis() ?? this.now();
    return Math.max(0, Math.floor((end - session.checkIn.toMillis()) / 60_000));
  }

  private startOfWeek(day: Date): Date {
    return this.addDays(startOfLocalDay(day), -((day.getDay() + 6) % 7));
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  isSameDay(first: Date | null, second: Date): boolean {
    return first !== null
      && first.getFullYear() === second.getFullYear()
      && first.getMonth() === second.getMonth()
      && first.getDate() === second.getDate();
  }
}