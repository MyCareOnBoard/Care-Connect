/**
 * Firebase Configuration
 *
 * Initializes Firebase app with environment variables.
 * Connects to Firebase Emulators in development mode.
 */

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID
)

// Firebase configuration from environment variables, with a demo fallback so visual routes render locally.
const firebaseConfig = isFirebaseConfigured
  ? {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
  : {
      apiKey: "demo-api-key",
      authDomain: "demo-careconnect.firebaseapp.com",
      projectId: "demo-careconnect",
      storageBucket: "demo-careconnect.appspot.com",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:demo",
    }

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Export auth instance for use in authentication
export const auth = getAuth(app)

// Keep Firestore reads aligned with API writes (getDb uses x-environment / VITE_API_ENVIRONMENT).
// Explicit VITE_FIREBASE_DATABASE_ID overrides auto-selection.
export const apiEnvironment = import.meta.env.VITE_API_ENVIRONMENT || "staging"

const explicitDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID

const resolvedDatabaseId =
  explicitDatabaseId !== undefined && explicitDatabaseId !== ""
    ? explicitDatabaseId
    : apiEnvironment === "staging"
      ? "staging"
      : undefined

export const firestoreDatabaseId = resolvedDatabaseId

export const db = resolvedDatabaseId
  ? getFirestore(app, resolvedDatabaseId)
  : getFirestore(app)

// Connect to Firebase Emulators in development mode
if (isFirebaseConfigured && import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  console.log('🔥 Firebase Emulators enabled')
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    console.log('✅ Connected to Auth Emulator on port 9099')

    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    console.log('✅ Connected to Firestore Emulator on port 8080')
  } catch {
    console.warn('⚠️ Emulator connection may already be established')
  }
}

// Helper to get fresh ID token
export async function getFreshIdToken(forceRefresh = true): Promise<string | null> {
  try {
    const user = auth.currentUser
    if (!user) return null
    return await user.getIdToken(forceRefresh)
  } catch (error) {
    console.error("Error getting fresh ID token:", error)
    return null
  }
}

export default app
