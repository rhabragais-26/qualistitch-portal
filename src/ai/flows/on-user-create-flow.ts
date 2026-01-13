
'use server';
/**
 * @fileOverview A flow that triggers on Firebase Auth user creation to create a user profile in Firestore.
 */

import { ai } from '@/ai/genkit';
import { onUserCreate } from 'firebase-functions/v2/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if not already done
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

export const onUserCreateFlow = ai.defineFlow(
  {
    name: 'onUserCreateFlow',
    trigger: {
      firebase: {
        onUserCreate: true,
      },
    },
  },
  async (user) => {
    if (!user.uid) {
      console.error('User object or user UID is missing.');
      return;
    }

    try {
      const userRef = db.collection('users').doc(user.uid);
      const doc = await userRef.get();

      if (doc.exists) {
        console.log(`Document for user ${user.uid} already exists.`);
        return;
      }

      console.log(`Creating user profile for ${user.uid}`);
      await userRef.set({
        uid: user.uid,
        email: user.email,
        firstName: '', // These will be empty and can be populated by the user later
        lastName: '',
        nickname: '',
        role: 'user', // Default role
        provider: user.providerData?.[0]?.providerId || 'password',
        createdAt: new Date().toISOString(),
      });

      console.log(`Successfully created user profile for ${user.uid}`);
    } catch (error) {
      console.error(`Failed to create user profile for ${user.uid}:`, error);
      // Optionally, you could add more robust error handling, like sending a notification.
    }
  }
);
