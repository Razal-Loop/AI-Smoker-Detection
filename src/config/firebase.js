import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

/**
 * Firebase Configuration
 * Using credentials from google-services.json and backend/.env
 */
const firebaseConfig = {
  apiKey: "AIzaSyBGBAJMawxfq5S87lwmOpwZlXfoVmI6NxM",
  authDomain: "smoking-detection-5e641.firebaseapp.com",
  projectId: "smoking-detection-5e641",
  storageBucket: "smoking-detection-5e641.firebasestorage.app",
  messagingSenderId: "257104530268",
  // Note: Web App ID should ideally be fetched from Firebase Console
  // Using the Mobile app ID prefix pattern for now if web-specific ID is unknown
  appId: "1:257104530268:web:757e64161f67f677d643a2"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app); // Uses default browser persistence
} else {
  // Mobile persistence - using require to avoid web bundling error
  const { getReactNativePersistence } = require('firebase/auth');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
