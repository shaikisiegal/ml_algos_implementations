import { startOfDay, startOfNextDay } from './time.ts';
import type { BabyEvent, EventType } from './types.ts';

export interface DaySummary {
  feeds: number;
  bottleMl: number;
  breastMin: number;
  diapers: number;
  wet: number;
  dirty: number;
  sleepMs: number;
  naps: number;
  baths: number;
}

/**
 * Totals for the calendar day containing `day`. Sleep that crosses midnight
 * is split so each day only counts its own share; an ongoing sleep counts
 * up to `now`.
 */
export function summarizeDay(events: BabyEvent[], day: number, now: number = Date.now()): DaySummary {
  const from = startOfDay(day);
  const to = startOfNextDay(day);
  const s: DaySummary = {
    feeds: 0, bottleMl: 0, breastMin: 0, diapers: 0, wet: 0, dirty: 0, sleepMs: 0, naps: 0, baths: 0,
  };
  for (const e of events) {
    if (e.type === 'sleep') {
      const end = e.end ?? now;
      const overlap = Math.min(end, to) - Math.max(e.start, from);
      if (overlap > 0) s.sleepMs += overlap;
      if (e.start >= from && e.start < to) s.naps += 1;
      continue;
    }
    if (e.start < from || e.start >= to) continue;
    switch (e.type) {
      case 'feed':
        s.feeds += 1;
        if (e.method === 'bottle' && e.amountMl) s.bottleMl += e.amountMl;
        if (e.method === 'breast' && e.durationMin) s.breastMin += e.durationMin;
        break;
      case 'diaper':
        s.diapers += 1;
        if (e.diaper === 'wet' || e.diaper === 'mixed') s.wet += 1;
        if (e.diaper === 'dirty' || e.diaper === 'mixed') s.dirty += 1;
        break;
      case 'bath':
        s.baths += 1;
        break;
    }
  }
  return s;
}

/** Events that belong on a given day's list (sleeps overlapping the day included), newest first. */
export function eventsForDay(events: BabyEvent[], day: number, now: number = Date.now()): BabyEvent[] {
  const from = startOfDay(day);
  const to = startOfNextDay(day);
  return events
    .filter((e) => {
      if (e.type === 'sleep') return e.start < to && (e.end ?? now) >= from;
      return e.start >= from && e.start < to;
    })
    .sort((a, b) => b.start - a.start);
}

export function lastOfType(events: BabyEvent[], type: EventType): BabyEvent | undefined {
  let best: BabyEvent | undefined;
  for (const e of events) if (e.type === type && (!best || e.start > best.start)) best = e;
  return best;
}

export function ongoingSleep(events: BabyEvent[]): BabyEvent | undefined {
  const last = lastOfType(events, 'sleep');
  return last && last.end === undefined ? last : undefined;
}

/** Set of event types per day key, for calendar dots. */
export function typesByDay(events: BabyEvent[], dayKeyFn: (t: number) => string): Map<string, Set<EventType>> {
  const map = new Map<string, Set<EventType>>();
  for (const e of events) {
    const k = dayKeyFn(e.start);
    let set = map.get(k);
    if (!set) map.set(k, (set = new Set()));
    set.add(e.type);
  }
  return map;
}
