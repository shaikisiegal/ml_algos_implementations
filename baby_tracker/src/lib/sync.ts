// Two-phone sync through Firebase Firestore.
// Layout: /families/{code} holds the baby profile; /families/{code}/events/{id} one doc per event.
// Firestore's local cache makes writes work offline; they upload when the connection returns.
import { getApps, initializeApp } from 'firebase/app';
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  deleteField,
  doc,
  initializeFirestore,
  memoryLocalCache,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { Platform } from 'react-native';

import { FIREBASE_CONFIG, FIRESTORE_EMULATOR } from './firebaseConfig.ts';
import type { BabyEvent, BabyProfile } from './types.ts';

export type SyncStatus = 'off' | 'connecting' | 'synced' | 'saving' | 'offline' | 'error';

export const syncAvailable = !!FIREBASE_CONFIG || !!FIRESTORE_EMULATOR;

let db: Firestore | null = null;

function firestore(): Firestore {
  if (db) return db;
  const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG ?? { projectId: 'demo-babylog', apiKey: 'demo' });
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    // IndexedDB cache on web (works offline, shared between tabs); memory elsewhere.
    localCache:
      Platform.OS === 'web' && typeof indexedDB !== 'undefined'
        ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        : memoryLocalCache(),
  });
  if (FIRESTORE_EMULATOR) {
    const [host, port] = FIRESTORE_EMULATOR.split(':');
    connectFirestoreEmulator(db, host, Number(port));
  }
  return db;
}

const familyDoc = (family: string) => doc(firestore(), 'families', family);
const eventsCol = (family: string) => collection(firestore(), 'families', family, 'events');
const eventDoc = (family: string, id: string) => doc(firestore(), 'families', family, 'events', id);

/** Firestore rejects `undefined`; JSON round-trip drops those keys. */
const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export interface FamilyListener {
  onEvents: (events: BabyEvent[]) => void;
  onProfile: (profile: BabyProfile | undefined) => void;
  onStatus: (status: SyncStatus) => void;
}

export function subscribeFamily(family: string, l: FamilyListener): () => void {
  l.onStatus('connecting');
  const unsubEvents = onSnapshot(
    eventsCol(family),
    { includeMetadataChanges: true },
    (snap) => {
      l.onEvents(snap.docs.map((d) => ({ ...(d.data() as BabyEvent), id: d.id })));
      l.onStatus(snap.metadata.hasPendingWrites ? 'saving' : snap.metadata.fromCache ? 'offline' : 'synced');
    },
    (err) => {
      console.warn('sync error', err);
      l.onStatus('error');
    },
  );
  const unsubProfile = onSnapshot(
    familyDoc(family),
    (snap) => {
      const data = snap.data() as { profile?: BabyProfile } | undefined;
      l.onProfile(data?.profile);
    },
    () => {},
  );
  return () => {
    unsubEvents();
    unsubProfile();
  };
}

// Writes are fire-and-forget: the local cache applies them immediately (also offline),
// and the snapshot listener reflects the result.
const report = (p: Promise<unknown>) => p.catch((err) => console.warn('sync write failed', err));

export function pushEvent(family: string, e: BabyEvent) {
  report(setDoc(eventDoc(family, e.id), clean(e)));
}

/** Partial update; a key set to `undefined` is removed from the stored event. */
export function patchEvent(family: string, id: string, patch: Partial<BabyEvent>) {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) data[k] = v === undefined ? deleteField() : v;
  report(updateDoc(eventDoc(family, id), data));
}

export function removeEvent(family: string, id: string) {
  report(deleteDoc(eventDoc(family, id)));
}

export function pushProfile(family: string, profile: BabyProfile) {
  report(setDoc(familyDoc(family), { profile: clean(profile), updatedAt: Date.now() }, { merge: true }));
}

/** Upload many events (and delete `removeIds`) in batches of ≤400 writes. */
export async function pushMany(family: string, events: BabyEvent[], removeIds: string[] = []) {
  const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [
    ...events.map((e) => (b: ReturnType<typeof writeBatch>) => b.set(eventDoc(family, e.id), clean(e))),
    ...removeIds.map((id) => (b: ReturnType<typeof writeBatch>) => b.delete(eventDoc(family, id))),
  ];
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(firestore());
    ops.slice(i, i + 400).forEach((op) => op(batch));
    await batch.commit();
  }
}
