import admin from "firebase-admin";

// Initialise once — safe to call multiple times
if (!admin.apps.length) {
  const projectId   = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  let initialized = false;
  if (clientEmail && privateKey && !privateKey.includes("YOUR_PRIVATE_KEY_HERE")) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      initialized = true;
    } catch (err) {
      console.warn("Firebase Admin cert init failed, falling back to default app:", err);
    }
  }

  if (!initialized) {
    admin.initializeApp({ projectId });
  }
}

export const adminDb = admin.firestore();
export default admin;
