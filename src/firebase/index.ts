'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

// Global cache for Firebase services
let firebaseServices: { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore; } | null = null;

/**
 * Initializes and/or retrieves the singleton instances of Firebase services.
 * This function ensures that Firebase is initialized only once, even if called
 * multiple times, which is crucial for preventing errors in environments with
 * hot-reloading, like Next.js.
 */
export function initializeFirebase() {
  // If the services have already been initialized, return the cached instances immediately.
  if (firebaseServices) {
    return firebaseServices;
  }

  // Check if a Firebase app has already been initialized.
  const isInitialized = getApps().length > 0;
  const app = isInitialized ? getApp() : initializeApp(firebaseConfig);
  
  // Get the Auth and Firestore instances.
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  // Cache the initialized services.
  firebaseServices = { firebaseApp: app, auth, firestore };

  // NOTE: Emulator connections have been removed to resolve connectivity issues
  // in the development environment. The app will connect to production services.

  return firebaseServices;
}


export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './firestore-writes';
export * from './auth-writes';
export * from './errors';
export * from './error-emitter';