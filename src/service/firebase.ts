import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

const firestoreDatabaseId =
  (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string | undefined) || '(default)';

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig as Record<string, string>);
    dbInstance = getFirestore(app, firestoreDatabaseId);
    authInstance = getAuth(app);
    googleProviderInstance = new GoogleAuthProvider();
  } catch (err) {
    console.error('[FIREBASE] Failed to initialize:', err);
    app = null;
    dbInstance = null;
    authInstance = null;
    googleProviderInstance = null;
  }
} else {
  console.warn(
    '[FIREBASE] Skipping initialization: missing VITE_FIREBASE_* environment variables. ' +
      'Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID in Netlify to enable Firebase features.',
  );
}

export const db = dbInstance as Firestore;
export const auth = authInstance as Auth;
export const googleProvider = googleProviderInstance as GoogleAuthProvider;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = authInstance?.currentUser ?? null;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validation connection helper
export async function testConnection() {
  if (!dbInstance) {
    console.warn('[FIREBASE] testConnection skipped: Firebase is not configured');
    return;
  }
  try {
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
    console.log('[FIREBASE] Connection verified');
  } catch (error) {
    // If it's a permission error, the connection is actually working (just not logged in)
    if (error instanceof Error && (error.message.includes('permission-denied') || error.message.includes('insufficient permissions'))) {
       console.log('[FIREBASE] Connection verified (Auth required)');
       return;
    }

    if(error instanceof Error && error.message.toLowerCase().includes('offline')) {
      console.error("[FIREBASE] Offline: Please check your internet connection or check if the Firestore project ID is correct.");
    } else {
        console.error("[FIREBASE] Connection check error:", error instanceof Error ? error.message : error);
    }
  }
}

export const signInWithGoogle = async () => {
    if (!authInstance || !googleProviderInstance) {
        const msg = 'Firebase is not configured. Set VITE_FIREBASE_* environment variables in Netlify to enable Google Sign-In.';
        console.error('[FIREBASE]', msg);
        throw new Error(msg);
    }
    try {
        const result = await signInWithPopup(authInstance, googleProviderInstance);
        return result.user;
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        throw error;
    }
};
