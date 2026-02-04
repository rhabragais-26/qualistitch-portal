
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
  getDoc,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUser } from '../provider';
import { z, ZodError } from 'zod';
import { getAuth } from 'firebase/auth';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

export interface UseDocOptions {
  listen?: boolean;
}

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
  refetch: () => Promise<void>;
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references and validates data with a Zod schema.
 * 
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} memoizedDocRef -
 * The Firestore DocumentReference. Waits if null/undefined. MUST BE MEMOIZED.
 * @param {z.Schema<T>} schema - A Zod schema to validate the document data.
 * @returns {UseDocResult<T>} Object with data, isLoading, error, refetch.
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
  schema?: z.Schema<T>,
  options: UseDocOptions = { listen: true }
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const { isUserLoading, userProfile } = useUser();

  const fetchData = useCallback(async (ref: DocumentReference<DocumentData>) => {
    setIsLoading(true);
    setError(null);
    try {
      const docSnap = await getDoc(ref);
      if (docSnap.exists()) {
        const docData = docSnap.data();
        if (schema) {
          const validationResult = schema.safeParse(docData);
          if (!validationResult.success) {
            throw new ZodError(validationResult.error.issues);
          }
          setData({ ...(validationResult.data as T), id: docSnap.id });
        } else {
          setData({ ...(docData as T), id: docSnap.id });
        }
      } else {
        setData(null);
      }
    } catch (e: any) {
       if (e instanceof ZodError) {
         setError(e);
       } else {
        const contextualError = new FirestorePermissionError({
            operation: 'get',
            path: ref.path,
        });
        setError(contextualError);
        errorEmitter.emit('permission-error', contextualError);
       }
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [schema]);

  const refetch = useCallback(async () => {
    if (memoizedDocRef) {
      await fetchData(memoizedDocRef);
    }
  }, [memoizedDocRef, fetchData]);

  useEffect(() => {
    // Wait until we have a ref AND auth finished initializing
    if (!memoizedDocRef || isUserLoading) {
      if (isUserLoading) {
        setIsLoading(true);
        setData(null);
        setError(null);
      }
      return;
    }
  
    // ✅ Critical gate: if user is not signed in, DO NOT query Firestore
    // This prevents requests being sent with auth:null
    const uid = getAuth().currentUser?.uid;

    if (!uid) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }
  
    if (options.listen) {
      setIsLoading(true);
      setError(null);
  
      const unsubscribe = onSnapshot(
        memoizedDocRef,
        (snapshot: DocumentSnapshot<DocumentData>) => {
          try {
            if (snapshot.exists()) {
              const docData = snapshot.data();
              if (schema) {
                const validationResult = schema.safeParse(docData);
                if (!validationResult.success) {
                  throw new ZodError(validationResult.error.issues);
                }
                setData({ ...(validationResult.data as T), id: snapshot.id });
              } else {
                setData({ ...(docData as T), id: snapshot.id });
              }
            } else {
              setData(null);
            }
            setError(null);
          } catch (e: any) {
            setError(e instanceof Error ? e : new Error('An unknown validation error occurred.'));
          } finally {
            setIsLoading(false);
          }
        },
        (error: FirestoreError) => {
          const contextualError = new FirestorePermissionError({
            operation: 'get',
            path: memoizedDocRef.path,
          });
  
          setError(contextualError);
          setData(null);
          setIsLoading(false);
  
          errorEmitter.emit('permission-error', contextualError);
        }
      );
  
      return () => unsubscribe();
    } else {
      fetchData(memoizedDocRef);
    }
  }, [memoizedDocRef, isUserLoading, schema, options.listen, fetchData]);

  return { data, isLoading, error, refetch };
}
