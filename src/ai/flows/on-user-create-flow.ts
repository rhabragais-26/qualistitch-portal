'use server';
import { onUserCreate } from '@genkit-ai/firebase/functions';
import { getFirestore } from 'firebase-admin/firestore';
import { defineFlow, run } from 'genkit';

export const onUserCreateFlow = onUserCreate(
  {
    name: 'onUserCreateFlow',
  },
  async (user) => {
    await run('createUserDocument', async () => {
      const firestore = getFirestore();
      const userDocRef = firestore.collection('users').doc(user.uid);

      // Check if the document already exists
      const docSnap = await userDocRef.get();
      if (docSnap.exists) {
        console.log(`User document for ${user.uid} already exists.`);
        return;
      }
      
      const userData = {
        uid: user.uid,
        email: user.email,
        firstName: '',
        lastName: '',
        nickname: '',
        role: 'user',
      };

      await userDocRef.set(userData);
      console.log(`Successfully created user document for ${user.uid}`);
    });
  }
);
