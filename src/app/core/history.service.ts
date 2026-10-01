import { inject, Injectable, signal } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { catchError, Observable, of, switchMap, tap } from 'rxjs';
import {
  collection,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import type { CollectionReference } from 'firebase/firestore';
import { AuthService } from './auth.service';
import { Attendance } from './attendance.service';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  readonly error = signal<string | null>(null);

  observeDay(day: Date): Observable<Attendance[]> {
    const start = startOfLocalDay(day);
    const end = addDays(start, 1);
    return this.observeRange(start, end);
  }

  observeWeek(day: Date): Observable<Attendance[]> {
    const selectedDay = startOfLocalDay(day);
    const mondayOffset = (selectedDay.getDay() + 6) % 7;
    const start = addDays(selectedDay, -mondayOffset);
    return this.observeRange(start, addDays(start, 7));
  }

  private observeRange(start: Date, end: Date): Observable<Attendance[]> {
    return this.authService.user$.pipe(
      switchMap((currentUser) => {
        if (!currentUser) {
          return of<Attendance[]>([]);
        }

        const attendanceCollection = collection(this.firestore, 'attendances') as CollectionReference<Attendance>;
        const attendanceQuery = query(
          attendanceCollection,
          where('userId', '==', currentUser.uid),
          where('checkIn', '>=', Timestamp.fromDate(start)),
          where('checkIn', '<', Timestamp.fromDate(end)),
          orderBy('checkIn', 'asc')
        );
        return collectionData<Attendance>(attendanceQuery, { idField: 'id' }).pipe(
          tap(() => this.error.set(null)),
          catchError(() => {
            this.error.set('Impossible de charger l’historique. Vérifiez votre connexion.');
            return of<Attendance[]>([]);
          })
        );
      })
    );
  }
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}