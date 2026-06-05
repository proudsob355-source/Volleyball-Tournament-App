import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};

const resolvedFirebaseConfig = {
  apiKey: (typeof process !== 'undefined' && process.env?.FIREBASE_API_KEY) || metaEnv.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: (typeof process !== 'undefined' && process.env?.FIREBASE_AUTH_DOMAIN) || metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: (typeof process !== 'undefined' && process.env?.FIREBASE_PROJECT_ID) || metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: (typeof process !== 'undefined' && process.env?.FIREBASE_STORAGE_BUCKET) || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: (typeof process !== 'undefined' && process.env?.FIREBASE_MESSAGING_SENDER_ID) || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: (typeof process !== 'undefined' && process.env?.FIREBASE_APP_ID) || metaEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  measurementId: (typeof process !== 'undefined' && process.env?.FIREBASE_MEASUREMENT_ID) || metaEnv.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId,
  firestoreDatabaseId: (typeof process !== 'undefined' && (process.env?.FIREBASE_FIRESTORE_DATABASE_ID || process.env?.FIREBASE_DATABASE_ID)) || metaEnv.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
};

const app = initializeApp(resolvedFirebaseConfig);
export const db = getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
