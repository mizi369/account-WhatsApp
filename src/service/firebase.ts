import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged as firebaseOnAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
// Use glob for potential config file to prevent build error if missing
const configs = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const configKey = '../../firebase-applet-config.json';

const firebaseConfig = configs[configKey] 
    ? (configs[configKey] as any).default 
    : {
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: "",
        firestoreDatabaseId: ""
    };

const hasConfig = firebaseConfig && firebaseConfig.apiKey;

const app = hasConfig ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null as any;
export const auth = app ? getAuth(app) : { 
    onAuthStateChanged: (cb: any) => { 
        if (typeof cb === 'function') cb(null); 
        else if (cb && typeof cb.next === 'function') cb.next(null);
        return () => {}; 
    },
    currentUser: null,
    signOut: async () => {},
    config: {}
} as any;
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
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

// Validation connection helper as required by instructions
export async function testConnection() {
  if (!db) {
    console.log('[FIREBASE] Skipping connection test (Not configured)');
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[FIREBASE] Connection verified');
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    } else {
        console.warn("[FIREBASE] Connection test result:", error);
    }
  }
}

export const signInWithGoogle = async () => {
    if (!app || !auth.signInWithPopup) {
        console.warn('[FIREBASE] Google Sign-In not available (Not configured)');
        // Mock fallback: if it's local dev, maybe skip?
        // For now, just throw a specific error
        throw new Error('Firebase not configured. Please add your credentials.');
    }
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error('Error signing in with Google:', error);
        throw error;
    }
};

export const onAuthStateChanged = (authInstance: any, callback: any) => {
    if (app && authInstance && authInstance.app) {
        return firebaseOnAuthStateChanged(authInstance, callback);
    }
    // Mock behavior
    if (typeof callback === 'function') callback(null);
    return () => {};
};

export const signOut = async (authInstance: any) => {
    if (app && authInstance && authInstance.app) {
        return firebaseSignOut(authInstance);
    }
    // Mock behavior
    console.log('[FIREBASE] Mock SignOut');
};
