// IMPORTANT: This file should only be used in server-side code (e.g., API routes, server actions).
// Do NOT import it in client components.

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config'; // We can still use the client config

// Use a service account for admin privileges
// IMPORTANT: In a real project, this would be handled securely via environment variables
// and not hardcoded. For this environment, we assume the service account is available.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined; // In a real deployed environment, this might be auto-configured

let adminApp: App;
let firestore: Firestore;

if (!getApps().length) {
  adminApp = initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined,
    // The databaseURL is not strictly necessary for Firestore but is good practice
    databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
  });
} else {
  adminApp = getApps()[0];
}

firestore = getFirestore(adminApp);

export { adminApp, firestore };
