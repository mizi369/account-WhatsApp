import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Check if Firebase keys are provided to avoid "invalid-api-key" error on startup
export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "";

if (!isFirebaseConfigured) {
  console.warn("[FIREBASE] Firebase API Key is missing. Please set VITE_FIREBASE_API_KEY in Settings > Secrets.");
}

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

// Initialize Firestore with long-polling for better reliability in proxied/iFrame environments
export const db = app ? initializeFirestore(app, {
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: true,
}, import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)') : { 
    collection: () => ({}), 
    doc: () => ({}) 
} as any;

export const auth = app ? getAuth(app) : { 
    currentUser: null, 
    onAuthStateChanged: () => () => {},
    // Mock internal methods to prevent "Cannot read properties of undefined" errors in firebase SDK
    _getInternal: () => ({ create: () => ({}) }),
    create: () => ({})
} as any;

// Safely initialize storage only if a bucket is provided
let storageInstance: any = { ref: () => ({}), uploadBytes: () => ({}), getDownloadURL: () => ({}) };
if (app && firebaseConfig.storageBucket) {
    try {
        storageInstance = getStorage(app);
    } catch (e) {
        console.error("[FIREBASE] Storage initialization failed:", e);
    }
}
export const storage = storageInstance;
export const googleProvider = new GoogleAuthProvider();

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider: any) => ({
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
export async function testConnection(): Promise<boolean> {
  if (!isFirebaseConfigured) return false; // Skip if not configured
  
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[FIREBASE] Connection verified');
    return true;
  } catch (error) {
    // If it's a permission error, the connection is actually working (just not logged in)
    if (error instanceof Error && (error.message.includes('permission-denied') || error.message.includes('insufficient permissions'))) {
       console.log('[FIREBASE] Connection verified (Auth required)');
       return true;
    }
    
    if(error instanceof Error && error.message.toLowerCase().includes('offline')) {
      console.error(`[FIREBASE] Offline: Please check your internet connection or check if the Firestore project ID is correct. (Project ID: ${firebaseConfig.projectId})`);
    } else {
        console.error("[FIREBASE] Connection check error:", error instanceof Error ? error.message : error);
    }
    return false;
  }
}

export const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
        throw new Error("Firebase tidak dikonfigurasi. Sila sediakan Firebase terlebih dahulu.");
    }

    try {
        console.log("[FIREBASE] Memulakan Google Sign-In...", { auth: !!auth, googleProvider: !!googleProvider });
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error: any) {
        console.error("Google Sign-In Error Detail:", error);
        // Special check for common errors
        if (error.code === 'auth/popup-closed-by-user') {
            throw new Error("Popup ditutup oleh pengguna.");
        }
        if (error.code === 'auth/cancelled-by-user') {
             throw new Error("Log masuk dibatalkan.");
        }
        throw error;
    }
};
