/**
 * Firestore, set up on its own.
 *
 * Kept apart from firebase.ts (Auth) so it is not in the bundle every page loads at start:
 * Auth is needed before anything renders, but Firestore is only read directly by the app
 * shell (the unread-messages badge) and the Messages page, which load after sign-in. Split
 * this way, the sign-in screens load without it.
 */

import { connectFirestoreEmulator, getFirestore } from "firebase/firestore"
import app, { isFirebaseConfigured } from "@/lib/firebase"

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

export const db = resolvedDatabaseId ? getFirestore(app, resolvedDatabaseId) : getFirestore(app)

if (isFirebaseConfigured && import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8080)
    console.log("✅ Connected to Firestore Emulator on port 8080")
  } catch {
    console.warn("⚠️ Firestore emulator connection may already be established")
  }
}
