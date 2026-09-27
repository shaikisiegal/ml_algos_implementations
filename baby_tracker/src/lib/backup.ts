import { EVENT_TYPES, type BabyEvent, type BabyProfile } from './types.ts';

export interface Backup {
  profile?: BabyProfile;
  events: BabyEvent[];
}

export function serializeBackup(b: Backup): string {
  return JSON.stringify({ app: 'baby-log', version: 1, exportedAt: new Date().toISOString(), ...b }, null, 2);
}

/** Parse and sanity-check a pasted backup. Throws an Error with a user-facing message. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text.trim());
  } catch {
    throw new Error('זה לא נראה כמו גיבוי של Baby Log (JSON לא תקין).');
  }
  const obj = data as { events?: unknown; profile?: unknown };
  if (!obj || !Array.isArray(obj.events)) throw new Error('לא נמצאו אירועים בגיבוי הזה.');
  const events = obj.events.filter(
    (e): e is BabyEvent =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as BabyEvent).id === 'string' &&
      typeof (e as BabyEvent).start === 'number' &&
      EVENT_TYPES.includes((e as BabyEvent).type),
  );
  if (events.length !== obj.events.length) {
    throw new Error(`${obj.events.length - events.length} רשומות בגיבוי פגומות, לא יובא דבר.`);
  }
  const p = obj.profile as BabyProfile | undefined;
  const profile = p && typeof p === 'object' && typeof p.name === 'string' ? { name: p.name, birthDate: typeof p.birthDate === 'number' ? p.birthDate : undefined } : undefined;
  return { profile, events };
}
