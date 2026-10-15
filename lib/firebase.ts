import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

let _authInstance: Auth | null = null;

export function getClientAuth(): Auth {
  if (!_authInstance) {
    if (!firebaseConfig.apiKey) {
      if (typeof window === "undefined") {
        throw new Error(
          "[Firebase] Client Auth cannot be initialized during server-side build or prerendering without NEXT_PUBLIC_FIREBASE_API_KEY."
        );
      }
      throw new Error(
        "[Firebase] Missing NEXT_PUBLIC_FIREBASE_API_KEY. " +
        "Please ensure all NEXT_PUBLIC_FIREBASE_* environment variables are configured in your deployment settings."
      );
    }
    _authInstance = getAuth(app);
  }
  return _authInstance;
}

// Proxy wrapper that provides safe inspection on the server during static prerendering,
// and delegates to the real Firebase Auth instance on the client.
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (typeof window === "undefined") {
      if (prop === "currentUser") return null;
      if (prop === "name") return app.name;
      if (prop === "app") return app;
    }
    const realAuth = getClientAuth();
    const val = (realAuth as any)[prop];
    return typeof val === "function" ? val.bind(realAuth) : val;
  },
  set(_target, prop, value) {
    (getClientAuth() as any)[prop] = value;
    return true;
  },
});

export default app;
