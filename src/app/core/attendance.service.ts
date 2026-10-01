import { computed, inject, Injectable, signal } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { collectionData } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { catchError, of, switchMap, tap } from 'rxjs';
import {
  addDoc,
  collection,
  doc,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { CollectionReference, Timestamp } from 'firebase/firestore';

export interface Attendance {
  id: string;
  userId: string;
  checkIn: Timestamp | null;
  checkOut: Timestamp | null;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  readonly error = signal<string | null>(null);
  readonly sessions = signal<Attendance[]>([]);
  readonly openSession = computed(() => this.sessions().find((session) => session.checkOut === null) ?? null);
  readonly todaySessions = computed(() => {
    const today = new Date();
    return this.sessions()
      .filter((session) => this.isToday(session.checkIn, today))
      .sort((first, second) => this.timestampValue(second.checkIn) - this.timestampValue(first.checkIn));
  });

  constructor() {
    this.authService.user$.pipe(
      switchMap((currentUser) => {
        if (!currentUser) {
          return of<Attendance[]>([]);
        }

        const attendanceCollection = collection(this.firestore, 'attendances') as CollectionReference<Attendance>;
        const attendanceQuery = query(
          attendanceCollection,
          where('userId', '==', currentUser.uid)
        );
        return collectionData<Attendance>(attendanceQuery, { idField: 'id' }).pipe(
          tap(() => this.error.set(null)),
          catchError(() => {
            this.error.set('Impossible de charger vos pointages. Vérifiez votre connexion.');
            return of<Attendance[]>([]);
          })
        );
      }),
      tap((sessions) => {
        if (sessions.length === 0 && !this.authService.user()) {
          this.error.set(null);
        }
      })
    ).subscribe((sessions) => {
      this.sessions.set(sessions);
    });
  }

  async checkIn(): Promise<void> {
    const currentUser = this.authService.user();
    if (!currentUser) {
      throw new Error('Vous devez être connecté pour pointer.');
    }
    if (this.openSession()) {
      throw new Error('Une session est déjà ouverte.');
    }

    await addDoc(collection(this.firestore, 'attendances'), {
      userId: currentUser.uid,
      checkIn: serverTimestamp(),
      checkOut: null,
    });
  }

  async checkOut(): Promise<void> {
    const openSession = this.openSession();
    if (!openSession) {
      throw new Error('Aucune session ouverte à clôturer.');
    }

    await updateDoc(doc(this.firestore, 'attendances', openSession.id), {
      checkOut: serverTimestamp(),
    });
  }

  private isToday(timestamp: Timestamp | null, today: Date): boolean {
    if (!timestamp) {
      return false;
    }

    const date = timestamp.toDate();
    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
  }

  private timestampValue(timestamp: Timestamp | null): number {
    return timestamp?.toMillis() ?? 0;
  }
}