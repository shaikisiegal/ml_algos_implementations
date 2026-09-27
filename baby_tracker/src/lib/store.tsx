import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { BabyEvent, BabyProfile } from './types.ts';

const EVENTS_KEY = 'babylog.events.v1';
const PROFILE_KEY = 'babylog.profile.v1';

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
}

const StoreContext = createContext<Store | null>(null);

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<BabyEvent[]>([]);
  const [profile, setProfileState] = useState<BabyProfile>({ name: '' });
  const loaded = useRef(false);

  useEffect(() => {
    // Web: ask the browser not to evict our data under storage pressure.
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    (async () => {
      try {
        const [rawEvents, rawProfile] = await Promise.all([
          AsyncStorage.getItem(EVENTS_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
        ]);
        if (rawEvents) setEvents(JSON.parse(rawEvents));
        if (rawProfile) setProfileState(JSON.parse(rawProfile));
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

  const addEvent = useCallback((e: NewEvent) => {
    const now = Date.now();
    const full: BabyEvent = { ...e, id: newId(), createdAt: now, updatedAt: now };
    setEvents((prev) => [...prev, full]);
    return full;
  }, []);

  const updateEvent = useCallback((id: string, patch: Partial<NewEvent>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e)));
  }, []);

  const replaceEvent = useCallback((id: string, next: NewEvent) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...next, id, createdAt: e.createdAt, updatedAt: Date.now() } : e)),
    );
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
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
      setProfile: setProfileState,
      replaceAll: setEvents,
    }),
    [ready, events, profile, addEvent, updateEvent, replaceEvent, deleteEvent],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}
