"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function hasFirebaseClientConfig() {
  return Boolean(
    firebaseConfig.apiKey
    && firebaseConfig.authDomain
    && firebaseConfig.projectId
    && firebaseConfig.appId
  );
}

let firebaseAuthCache: Auth | null | undefined;

export function getFirebaseAuthInstance(): Auth | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (firebaseAuthCache !== undefined) {
    return firebaseAuthCache;
  }

  if (!hasFirebaseClientConfig()) {
    firebaseAuthCache = null;
    return null;
  }

  const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  firebaseAuthCache = getAuth(firebaseApp);
  return firebaseAuthCache;
}

export function isFirebaseClientConfigured() {
  return hasFirebaseClientConfig();
}

let persistencePromise: Promise<void> | null = null;

export function ensureFirebaseLocalPersistence(): Promise<void> {
  const firebaseAuth = getFirebaseAuthInstance();
  if (!firebaseAuth) {
    return Promise.resolve();
  }

  if (!persistencePromise) {
    persistencePromise = setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {
      // If persistence fails (browser policy), continue with Firebase defaults.
    });
  }

  return persistencePromise;
}
