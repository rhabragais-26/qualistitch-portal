
'use server';

import { onUserCreate } from '@genkit-ai/next/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { UserRecord } from 'firebase-admin/auth';
import {initializeApp, getApps, App} from 'firebase-admin/app';

// Ensure Firebase Admin is initialized only once
let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp();
} else {
  adminApp = getApps()[0];
}

export const onUserCreateFlow = onUserCreate(
  async (user: UserRecord): Promise<void> => {
    try {
      const db = getFirestore(adminApp);
      const userRef = db.collection('users').doc(user.uid);

      console.log(`Creating Firestore document for user: ${user.uid}`);

      await userRef.set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        role: 'user', // Default role
        createdAt: new Date().toISOString(),
      });

      console.log(`Successfully created Firestore document for user: ${user.uid}`);
    } catch (error) {
      console.error('Error in onUserCreateFlow:', error);
      // Log the error but don't re-throw, as this could cause a function loop
      // or prevent the user from being created if not handled carefully.
    }
  }
);
