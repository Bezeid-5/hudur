import { inject, Injectable, signal } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { catchError, of, switchMap, tap } from 'rxjs';
import {
  addDoc,
  collection,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import type { CollectionReference, FieldValue, Timestamp } from 'firebase/firestore';
import { AuthService } from './auth.service';

export interface Activity {
  id: string;
  userId: string;
  attendanceId: string;
  title: string;
  durationMinutes: number;
  description?: string;
  createdAt: Timestamp | null;
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  readonly error = signal<string | null>(null);
  readonly activities = signal<Activity[]>([]);

  constructor() {
    this.authService.user$.pipe(
      switchMap((currentUser) => {
        if (!currentUser) {
          return of<Activity[]>([]);
        }

        const activityCollection = collection(this.firestore, 'activities') as CollectionReference<Activity>;
        const activityQuery = query(
          activityCollection,
          where('userId', '==', currentUser.uid)
        );
        return collectionData<Activity>(activityQuery, { idField: 'id' }).pipe(
          tap(() => this.error.set(null)),
          catchError(() => {
            this.error.set('Impossible de charger vos activités. Vérifiez votre connexion.');
            return of<Activity[]>([]);
          })
        );
      }),
      tap((activities) => {
        if (activities.length === 0 && !this.authService.user()) {
          this.error.set(null);
        }
      })
    ).subscribe((activities) => {
      this.activities.set(activities);
    });
  }

  async createActivity(
    attendanceId: string,
    title: string,
    durationMinutes: number,
    description?: string,
  ): Promise<void> {
    const currentUser = this.authService.user();
    if (!currentUser) {
      throw new Error('Vous devez être connecté pour ajouter une activité.');
    }

    const activity: {
      userId: string;
      attendanceId: string;
      title: string;
      durationMinutes: number;
      createdAt: FieldValue;
      description?: string;
    } = {
      userId: currentUser.uid,
      attendanceId,
      title: title.trim(),
      durationMinutes,
      createdAt: serverTimestamp(),
    };

    const trimmedDescription = description?.trim();
    if (trimmedDescription) {
      activity.description = trimmedDescription;
    }

    await addDoc(collection(this.firestore, 'activities'), activity);
  }
}