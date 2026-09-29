import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), provideFirebaseApp(() => initializeApp({ projectId: "hudur-dev", appId: "1:200585852678:web:8567d1e0df88c155191087", storageBucket: "hudur-dev.firebasestorage.app", apiKey: "AIzaSyBPVnJGFmE1QqHi_PIuTwO0dfcy0oYrj8Y", authDomain: "hudur-dev.firebaseapp.com", messagingSenderId: "200585852678" })), provideAuth(() => getAuth()), provideFirestore(() => getFirestore())]
};
