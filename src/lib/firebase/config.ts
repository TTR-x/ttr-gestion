// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration is now read from environment variables
// for improved security. The .env.local file is the best place to store them
// for local development.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

import { getMessaging, isSupported } from "firebase/messaging";

// Initialize Firebase
let app;
// Check if all config values are provided
const isConfigComplete = Object.values(firebaseConfig).every(value => value);

if (!isConfigComplete) {
  console.error("###########################################################################################");
  console.error("FIREBASE CONFIGURATION IS INCOMPLETE. Please check your .env.local file.");
  console.error("###########################################################################################");
}


if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const storage = getStorage(app);
const database = getDatabase(app);

// Messaging initialization with support check
let messaging = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      messaging = getMessaging(app);
    }
  }).catch(err => console.log('Messaging not supported:', err));
}

// For Firebase Realtime Database on web, offline persistence is enabled by default
// for most modern browsers. There is no explicit 'enablePersistence' call needed
// as there is for Firestore. The SDK handles caching automatically.
console.log("Firebase Realtime Database offline persistence is enabled by default.");


export { app, database, auth, storage, messaging };
