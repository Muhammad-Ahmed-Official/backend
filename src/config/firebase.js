import admin from 'firebase-admin';

let firebaseApp = null;
let initialized = false;

export function getFirebaseApp() {
  if (initialized) return firebaseApp;
  initialized = true;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
    return null;
  }

  try {
    const credential = JSON.parse(serviceAccount);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(credential),
    });
    console.log('[FCM] Firebase Admin initialized');
  } catch (e) {
    console.error('[FCM] Failed to initialize Firebase Admin:', e.message);
    firebaseApp = null;
  }

  return firebaseApp;
}
