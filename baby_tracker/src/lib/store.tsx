import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { generateFamilyCode } from './familyCode.ts';
import { patchEvent, pushEvent, pushMany, pushProfile, removeEvent, subscribeFamily, syncAvailable, type SyncStatus } from './sync.ts';
import type { BabyEvent, BabyProfile } from './types.ts';

const EVENTS_KEY = 'babylog.events.v1';
const PROFILE_KEY = 'babylog.profile.v1';
const FAMILY_KEY = 'babylog.family.v1';

export type NewEvent = Omit<BabyEvent, 'id' | 'createdAt' | 'updatedAt'>;

interface Store {
  ready: boolean;
  events: BabyEvent[];
  profile: BabyProfile;
  addEvent: (e: NewEvent) => BabyEvent;
  updateEvent: (id: string, patch: Partial<NewEvent>) => void;
  /** Overwrite all fields of an event (used by the edit form). */
  replaceEvent: (id: string, next: NewEvent) => void;
  deleteEvent: (id: string) => void;
  setProfile: (p: BabyProfile) => void;
  replaceAll: (events: BabyEvent[]) => void;

  // Two-phone sync (see sync.ts). `family` is the shared family code, or null when not syncing.
  syncAvailable: boolean;
  family: string | null;
  syncStatus: SyncStatus;
  /** First phone: create a new family code and upload this phone's data. */
  createFamily: () => string;
  /** Second phone: join with a code; this phone's events are added to the family's. */
  joinFamily: (code: string) => void;
  leaveFamily: () => void;
}

const StoreContext = createContext<Store | null>(null);

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<BabyEvent[]>([]);
  const [profile, setProfileState] = useState<BabyProfile>({ name: '' });
  const [family, setFamily] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('off');
  const loaded = useRef(false);
  // Latest values for callbacks that must not re-create on every change.
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const familyRef = useRef(family);
  familyRef.current = family;

  useEffect(() => {
    // Web: ask the browser not to evict our data under storage pressure.
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    (async () => {
      try {
        const [rawEvents, rawProfile, rawFamily] = await Promise.all([
          AsyncStorage.getItem(EVENTS_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(FAMILY_KEY),
        ]);
        if (rawEvents) setEvents(JSON.parse(rawEvents));
        if (rawProfile) setProfileState(JSON.parse(rawProfile));
        if (rawFamily && syncAvailable) setFamily(rawFamily);
      } catch (err) {
        console.warn('Failed to load saved data', err);
      } finally {
        loaded.current = true;
        setReady(true);
      }
    })();
  }, []);

  // Persist after every change (but never before the initial load finished,
  // so an early write can't wipe what's on disk).
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events)).catch(console.warn);
  }, [events]);
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)).catch(console.warn);
  }, [profile]);

  // While syncing, the family's shared data (Firestore) is the source of truth: it replaces
  // local state on every change, from either phone. Local edits are applied right away and
  // also written to Firestore, which queues them while offline.
  useEffect(() => {
    if (!family) {
      setSyncStatus('off');
      return;
    }
    return subscribeFamily(family, {
      onEvents: setEvents,
      onProfile: (remote) => {
        if (remote) setProfileState(remote);
        else if (profileRef.current.name || profileRef.current.birthDate) pushProfile(family, profileRef.current);
      },
      onStatus: setSyncStatus,
    });
  }, [family]);

  const addEvent = useCallback((e: NewEvent) => {
    const now = Date.now();
    const full: BabyEvent = { ...e, id: newId(), createdAt: now, updatedAt: now };
    setEvents((prev) => [...prev, full]);
    if (familyRef.current) pushEvent(familyRef.current, full);
    return full;
  }, []);

  const updateEvent = useCallback((id: string, patch: Partial<NewEvent>) => {
    const updatedAt = Date.now();
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch, updatedAt } : e)));
    if (familyRef.current) patchEvent(familyRef.current, id, { ...patch, updatedAt });
  }, []);

  const replaceEvent = useCallback((id: string, next: NewEvent) => {
    const old = eventsRef.current.find((e) => e.id === id);
    const full: BabyEvent = { ...next, id, createdAt: old?.createdAt ?? Date.now(), updatedAt: Date.now() };
    setEvents((prev) => prev.map((e) => (e.id === id ? full : e)));
    if (familyRef.current) pushEvent(familyRef.current, full);
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (familyRef.current) removeEvent(familyRef.current, id);
  }, []);

  const setProfile = useCallback((p: BabyProfile) => {
    setProfileState(p);
    if (familyRef.current) pushProfile(familyRef.current, p);
  }, []);

  const replaceAll = useCallback((next: BabyEvent[]) => {
    const f = familyRef.current;
    if (f) {
      const keep = new Set(next.map((e) => e.id));
      const removeIds = eventsRef.current.filter((e) => !keep.has(e.id)).map((e) => e.id);
      pushMany(f, next, removeIds).catch((err) => console.warn('sync write failed', err));
    }
    setEvents(next);
  }, []);

  const startSync = useCallback((code: string) => {
    // Upload this phone's events (ids are unique, so this merges with what's already there).
    pushMany(code, eventsRef.current).catch((err) => console.warn('sync upload failed', err));
    AsyncStorage.setItem(FAMILY_KEY, code).catch(console.warn);
    setFamily(code);
  }, []);

  const createFamily = useCallback(() => {
    const code = generateFamilyCode();
    pushProfile(code, profileRef.current);
    startSync(code);
    return code;
  }, [startSync]);

  const leaveFamily = useCallback(() => {
    AsyncStorage.removeItem(FAMILY_KEY).catch(console.warn);
    setFamily(null);
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      events,
      profile,
      addEvent,
      updateEvent,
      replaceEvent,
      deleteEvent,
      setProfile,
      replaceAll,
      syncAvailable,
      family,
      syncStatus,
      createFamily,
      joinFamily: startSync,
      leaveFamily,
    }),
    [ready, events, profile, addEvent, updateEvent, replaceEvent, deleteEvent, setProfile, replaceAll, family, syncStatus, createFamily, startSync, leaveFamily],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}
