import type { FirebaseOptions } from 'firebase/app';

/**
 * Firebase project used to sync between phones. Paste the web-app config from
 * Firebase console → Project settings → Your apps → Web app (SDK setup and configuration).
 * These values identify the project; they are not secret (access is guarded by
 * firestore.rules and the unguessable family code).
 *
 * Leave as null to run without sync.
 */
export const FIREBASE_CONFIG: FirebaseOptions | null = null;

/** For local testing only: `EXPO_PUBLIC_FIRESTORE_EMULATOR=127.0.0.1:8080` at build time. */
export const FIRESTORE_EMULATOR: string | undefined = process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR || undefined;
