
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  getDocs,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUser } from '../provider';
import { z, ZodError } from 'zod';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

export interface UseCollectionOptions {
  listen?: boolean;
}

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
  refetch: () => Promise<void>;
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries and validates data with a Zod schema.
 * 
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} memoizedTargetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined. MUST BE MEMOIZED.
 * @param {z.Schema<T>} schema - A Zod schema to validate the document data.
 * @param {UseCollectionOptions} options - Options for the hook, e.g., { listen: false } for a one-time fetch.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
    schema?: z.Schema<T>,
    options: UseCollectionOptions = { listen: true }
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const { user, isUserLoading } = useUser();

  const fetchData = useCallback(async (ref: CollectionReference<DocumentData> | Query<DocumentData>) => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(ref);
      const results: ResultItemType[] = snapshot.docs.map(doc => {
        const docData = doc.data();
        if (schema) {
          const validationResult = schema.safeParse(docData);
          if (!validationResult.success) {
            throw new ZodError(validationResult.error.issues);
          }
          return { ...(validationResult.data as T), id: doc.id };
        }
        return { ...(docData as T), id: doc.id };
      });
      setData(results);
      setError(null);
    } catch (e: any) {
      if (e instanceof ZodError) {
         setError(e);
      } else {
        const path: string =
          ref.type === 'collection'
            ? (ref as CollectionReference).path
            : (ref as unknown as InternalQuery)._query.path.canonicalString();

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
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
    if (memoizedTargetRefOrQuery) {
      await fetchData(memoizedTargetRefOrQuery);
    }
  }, [memoizedTargetRefOrQuery, fetchData]);


  useEffect(() => {
    if (!memoizedTargetRefOrQuery || isUserLoading || !user) {
      if (isUserLoading || !user) {
        setIsLoading(true);
        setData(null);
        setError(null);
      }
      return;
    }

    if (options.listen === false) {
        fetchData(memoizedTargetRefOrQuery);
        return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        try {
          const results: ResultItemType[] = snapshot.docs.map(doc => {
            const docData = doc.data();
            if (schema) {
              const validationResult = schema.safeParse(docData);
              if (!validationResult.success) {
                // Throw a detailed error for a specific document
                throw new ZodError(validationResult.error.issues);
              }
              return { ...(validationResult.data as T), id: doc.id };
            }
            return { ...(docData as T), id: doc.id };
          });
          setData(results);
          setError(null);
        } catch (e: any) {
           setError(e instanceof Error ? e : new Error('An unknown validation error occurred.'));
        } finally {
          setIsLoading(false);
        }
      },
      (error: FirestoreError) => {
        const path: string =
          memoizedTargetRefOrQuery.type === 'collection'
            ? (memoizedTargetRefOrQuery as CollectionReference).path
            : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString();

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);

        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery, isUserLoading, user, schema, options.listen, fetchData]);
  
  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    console.warn('The query/reference passed to useCollection was not memoized with useMemoFirebase. This can lead to performance issues.', memoizedTargetRefOrQuery);
  }
  
  return { data, isLoading, error, refetch };
}
