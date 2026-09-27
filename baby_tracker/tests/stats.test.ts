/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeEvent } from '../src/lib/describe.ts';
import { eventsForDay, lastOfType, ongoingSleep, summarizeDay } from '../src/lib/stats.ts';
import { HOUR, MINUTE, dayKey, formatAge, formatDuration, startOfNextDay } from '../src/lib/time.ts';
import type { BabyEvent } from '../src/lib/types.ts';

const at = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m).getTime();
let n = 0;
const ev = (e: Omit<BabyEvent, 'id' | 'createdAt' | 'updatedAt'>): BabyEvent => ({ ...e, id: String(n++), createdAt: 0, updatedAt: 0 });

test('formatDuration', () => {
  assert.equal(formatDuration(0), '0m');
  assert.equal(formatDuration(45 * MINUTE), '45m');
  assert.equal(formatDuration(2 * HOUR), '2h');
  assert.equal(formatDuration(HOUR + 25 * MINUTE), '1h 25m');
});

test('startOfNextDay / dayKey', () => {
  assert.equal(dayKey(startOfNextDay(at(30, 15))), '2026-10-01');
});

test('formatAge', () => {
  assert.equal(formatAge(at(20, 8), at(27, 23)), '7 days old');
  assert.equal(formatAge(at(1, 8), at(27, 8)), '3 weeks 5d old');
});

test('summarizeDay totals feeds, diapers and splits overnight sleep', () => {
  const events = [
    ev({ type: 'feed', start: at(27, 8), method: 'bottle', amountMl: 90 }),
    ev({ type: 'feed', start: at(27, 11), method: 'bottle', amountMl: 120 }),
    ev({ type: 'feed', start: at(27, 14), method: 'breast', side: 'left', durationMin: 15 }),
    ev({ type: 'feed', start: at(26, 22), method: 'bottle', amountMl: 60 }), // other day
    ev({ type: 'diaper', start: at(27, 9), diaper: 'wet' }),
    ev({ type: 'diaper', start: at(27, 10), diaper: 'mixed' }),
    ev({ type: 'diaper', start: at(27, 12), diaper: 'dirty' }),
    ev({ type: 'sleep', start: at(26, 22), end: at(27, 2) }), // 2h on the 27th
    ev({ type: 'sleep', start: at(27, 13), end: at(27, 14, 30) }), // 1.5h
  ];
  const s = summarizeDay(events, at(27, 12), at(27, 20));
  assert.equal(s.feeds, 3);
  assert.equal(s.bottleMl, 210);
  assert.equal(s.breastMin, 15);
  assert.equal(s.diapers, 3);
  assert.equal(s.wet, 2);
  assert.equal(s.dirty, 2);
  assert.equal(s.sleepMs, 3.5 * HOUR);
  assert.equal(s.naps, 1);

  const prev = summarizeDay(events, at(26, 12), at(27, 20));
  assert.equal(prev.sleepMs, 2 * HOUR);
  assert.equal(prev.bottleMl, 60);
});

test('ongoing sleep counts up to now and appears in the day list', () => {
  const sleep = ev({ type: 'sleep', start: at(27, 19) });
  const events = [ev({ type: 'sleep', start: at(27, 13), end: at(27, 14) }), sleep];
  assert.equal(ongoingSleep(events), sleep);
  assert.equal(summarizeDay(events, at(27, 0), at(27, 20)).sleepMs, 2 * HOUR);
  assert.deepEqual(eventsForDay(events, at(27, 0), at(27, 20)).map((e) => e.id), [sleep.id, events[0].id]);
});

test('lastOfType picks the latest by start time, not insertion order', () => {
  const late = ev({ type: 'feed', start: at(27, 10) });
  const events = [late, ev({ type: 'feed', start: at(27, 6) })];
  assert.equal(lastOfType(events, 'feed'), late);
  assert.equal(ongoingSleep(events), undefined);
});

test('describeEvent', () => {
  assert.equal(describeEvent(ev({ type: 'feed', start: 0, method: 'bottle', amountMl: 120, milk: 'formula' })), 'Bottle · 120 ml formula');
  assert.equal(describeEvent(ev({ type: 'feed', start: 0, method: 'breast', side: 'both', durationMin: 10 })), 'Breast · both sides · 10 min');
  assert.equal(describeEvent(ev({ type: 'diaper', start: 0, diaper: 'dirty', color: 'yellow' })), '💩 Dirty · yellow');
  assert.equal(describeEvent(ev({ type: 'sleep', start: 0, end: 90 * MINUTE })), 'Slept 1h 30m');
  assert.equal(describeEvent(ev({ type: 'medicine', start: 0, medName: 'Vitamin D', dose: '1 drop' })), 'Vitamin D · 1 drop');
});
