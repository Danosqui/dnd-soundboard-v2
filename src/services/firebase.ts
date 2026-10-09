import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs
} from 'firebase/firestore';
import { 
  getStorage, 
  FirebaseStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { SoundItem, SoundCategory } from '../types/sound';

export interface FirebaseConfigParams {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const STORAGE_KEY_FIREBASE_CONFIG = 'dnd_soundboard_firebase_config';

export function getStoredFirebaseConfig(): FirebaseConfigParams | null {
  // Check env first
  if (
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  ) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (raw) {
      return JSON.parse(raw) as FirebaseConfigParams;
    }
  } catch (e) {
    console.error('Failed to parse stored firebase config', e);
  }

  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseConfigParams | null) {
  if (!config) {
    localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
  } else {
    localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
  }
}

let currentApp: FirebaseApp | null = null;
let currentDb: Firestore | null = null;
let currentStorage: FirebaseStorage | null = null;

export function initFirebase(config?: FirebaseConfigParams | null): boolean {
  const conf = config || getStoredFirebaseConfig();
  if (!conf || !conf.apiKey || !conf.projectId) {
    currentApp = null;
    currentDb = null;
    currentStorage = null;
    return false;
  }

  try {
    if (getApps().length > 0) {
      currentApp = getApp();
    } else {
      currentApp = initializeApp(conf);
    }
    currentDb = getFirestore(currentApp);
    currentStorage = getStorage(currentApp);
    return true;
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
    return false;
  }
}

export function getFirebaseInstances() {
  if (!currentApp) {
    initFirebase();
  }
  return {
    app: currentApp,
    db: currentDb,
    storage: currentStorage,
    isConfigured: !!(currentApp && currentDb && currentStorage),
  };
}
