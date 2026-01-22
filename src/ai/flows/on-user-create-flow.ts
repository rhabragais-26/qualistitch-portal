'use server';

import { onUserCreate } from 'firebase-functions/v2/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Ensure Firebase Admin is initialized only once
if (getApps().length === 0) {
  initializeApp();
}

const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

/**
 * A Cloud Function that triggers when a new Firebase Authentication user is created.
 * It creates a corresponding user profile document in the 'users' Firestore collection.
 */
export const createuserprofile = onUserCreate(async (event) => {
  const user = event.data; // The user record created
  const { uid, email, displayName } = user;

  const db = getFirestore();
  const userRef = db.collection('users').doc(uid);

  // Extract first and last name from displayName if available
  const nameParts = displayName?.split(' ') || [];
  const firstName = toTitleCase(nameParts[0] || '');
  const lastName = toTitleCase(nameParts.slice(1).join(' ') || '');

  try {
    await userRef.set({
      uid,
      email,
      firstName,
      lastName,
      nickname: toTitleCase(displayName || ''), // Use displayName as a fallback for nickname
      role: 'user', // Assign a default role
      position: 'Not Assigned', // Assign a default position
      createdAt: new Date().toISOString(),
    });
    console.log(`Successfully created profile for user: ${uid}`);
  } catch (error) {
    console.error(`Error creating profile for user ${uid}:`, error);
  }
});
