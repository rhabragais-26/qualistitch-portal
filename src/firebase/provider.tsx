
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, DocumentData, Unsubscribe, getDoc, updateDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { initiateAnonymousSignIn } from './auth-writes';

// Define the shape of the user profile document in Firestore
interface UserProfile {
  nickname: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'user' | 'admin';
  position: string;
  photoURL?: string;
  lastSeen?: string;
}

interface UserAuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; 
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser()
export interface UserHookResult {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

interface FirebaseProviderProps {
    children: ReactNode;
    firebaseApp: FirebaseApp;
    firestore: Firestore;
    auth: Auth;
}

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    userProfile: null,
    isAdmin: false,
    isUserLoading: true,
    userError: null,
  });

  // Effect for simplified user presence
  useEffect(() => {
    if (!firestore || !userAuthState.user) return;

    const userStatusRef = doc(firestore, 'users', userAuthState.user.uid);

    const updateLastSeen = () => {
      updateDoc(userStatusRef, { lastSeen: new Date().toISOString() }).catch(err => {
        // This might fail if the user is offline, which is expected.
        // console.warn("Could not update lastSeen:", err.message);
      });
    };

    updateLastSeen(); // Update once on load
    const interval = setInterval(updateLastSeen, 60 * 1000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, [firestore, userAuthState.user]);

  // Effect to subscribe to Firebase auth state changes and fetch user profile
  useEffect(() => {
    if (!auth || !firestore) {
      setUserAuthState({ user: null, userProfile: null, isAdmin: false, isUserLoading: false, userError: new Error("Auth or Firestore service not provided.") });
      return;
    }

    setUserAuthState({ user: null, userProfile: null, isAdmin: false, isUserLoading: true, userError: null });

    let profileUnsubscribe: Unsubscribe | undefined;

    const authUnsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        // If a previous user's profile listener is active, unsubscribe from it.
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = undefined;
        }

        if (firebaseUser) {
          // User is signed in, fetch their profile from Firestore.
          const profileDocRef = doc(firestore, 'users', firebaseUser.uid);
          
          profileUnsubscribe = onSnapshot(profileDocRef, 
            (docSnap) => {
              if (docSnap.exists()) {
                const profileData = docSnap.data() as UserProfile;
                const isAdmin = profileData.role === 'admin';
                setUserAuthState({
                  user: firebaseUser,
                  userProfile: profileData,
                  isAdmin: isAdmin,
                  isUserLoading: false,
                  userError: null
                });
              } else {
                 // Profile does not exist yet, might be a race condition during signup.
                 // We will set user but keep profile as null.
                 // The on-user-create flow should create the doc shortly.
                 setUserAuthState({
                   user: firebaseUser,
                   userProfile: null,
                   isAdmin: false,
                   isUserLoading: false, // Stop loading, but profile is not ready.
                   userError: null
                 });
              }
            },
            (error) => {
              console.error("FirebaseProvider: Error fetching user profile:", error);
              setUserAuthState({
                user: firebaseUser,
                userProfile: null,
                isAdmin: false,
                isUserLoading: false,
                userError: error
              });
            }
          );
        } else {
          // No user is signed in.
          setUserAuthState({ user: null, userProfile: null, isAdmin: false, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, userProfile: null, isAdmin: false, isUserLoading: false, userError: error });
      }
    );

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, [auth, firestore]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      userProfile: userAuthState.userProfile,
      isAdmin: userAuthState.isAdmin,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

// ... (rest of the hooks remain the same)


/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    userProfile: context.userProfile,
    isAdmin: context.isAdmin,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const { user, userProfile, isAdmin, isUserLoading, userError } = useFirebase();
  return { user, userProfile, isAdmin, isUserLoading, userError };
};
