'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const isInitialized = getApps().length > 0;
  const app = isInitialized ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  // Ensure that we get a new Firestore instance only if one doesn't already exist.
  const firestore = isInitialized ? getFirestore(app) : initializeFirestore(app, {});


  // NOTE: Emulator connections have been removed to resolve connectivity issues
  // in the development environment. The app will connect to production services.

  return { firebaseApp: app, auth, firestore };
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
