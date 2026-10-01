import { inject, Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

@Injectable()
export class UserProfileService {
  private readonly firestore = inject(Firestore);

  async createEmployeeProfile(uid: string, displayName: string, email: string): Promise<void> {
    await setDoc(doc(this.firestore, 'users', uid), {
      displayName,
      email,
      role: 'employee',
      createdAt: serverTimestamp(),
    });
  }
}