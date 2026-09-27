/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { finishTimer, formatClock, startSide, timerElapsed, toggleSide } from '../src/lib/breast.ts';
import { describeEvent } from '../src/lib/describe.ts';
import { dailySeries, eventsForDay, lastOfType, ongoingSleep, predictNextNap, recommendedSleepHours, summarizeDay } from '../src/lib/stats.ts';
import { HOUR, MINUTE, dayKey, formatAge, formatDuration, startOfNextDay } from '../src/lib/time.ts';
import type { BabyEvent } from '../src/lib/types.ts';

const at = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m).getTime();
let n = 0;
const ev = (e: Omit<BabyEvent, 'id' | 'createdAt' | 'updatedAt'>): BabyEvent => ({ ...e, id: String(n++), createdAt: 0, updatedAt: 0 });

test('formatDuration', () => {
  assert.equal(formatDuration(0), '0\u00A0ד׳');
  assert.equal(formatDuration(45 * MINUTE), '45\u00A0ד׳');
  assert.equal(formatDuration(2 * HOUR), '2\u00A0ש׳');
  assert.equal(formatDuration(HOUR + 25 * MINUTE), '1\u00A0ש׳ 25\u00A0ד׳');
});

test('startOfNextDay / dayKey', () => {
  assert.equal(dayKey(startOfNextDay(at(30, 15))), '2026-10-01');
});

test('formatAge', () => {
  assert.equal(formatAge(at(20, 8), at(27, 23)), '7 ימים (שבוע 2)');
  assert.equal(formatAge(at(27, 8), at(27, 9)), '0 ימים (שבוע 1)');
  // born 7 Jul → 27 Sep = 2 months 20 days, day 82 → week 12
  assert.equal(formatAge(new Date(2026, 6, 7).getTime(), at(27, 9)), '2 ח׳ 20 י׳ (שבוע 12)');
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
  assert.equal(describeEvent(ev({ type: 'feed', start: 0, method: 'bottle', amountMl: 120, milk: 'formula' })), 'בקבוק · 120 מ״ל תמ״ל');
  assert.equal(describeEvent(ev({ type: 'feed', start: 0, method: 'breast', side: 'both', durationMin: 10 })), 'הנקה · שני הצדדים · 10\u00A0ד׳');
  assert.equal(describeEvent(ev({ type: 'diaper', start: 0, diaper: 'dirty', color: 'yellow' })), '💩 קקי · צהוב');
  assert.equal(describeEvent(ev({ type: 'sleep', start: 0, end: 90 * MINUTE })), 'שינה של 1\u00A0ש׳ 30\u00A0ד׳');
  assert.equal(describeEvent(ev({ type: 'medicine', start: 0, medName: 'Vitamin D', dose: '1 drop' })), 'Vitamin D · 1 drop');
});

test('breast timer: start, switch sides, pause, finish', () => {
  const t0 = at(27, 10);
  let t = startSide(undefined, 'left', t0);
  assert.deepEqual(timerElapsed(t, t0 + 5 * MINUTE), { left: 5 * MINUTE, right: 0, total: 5 * MINUTE });
  t = toggleSide(t, 'right', t0 + 7 * MINUTE); // switch: left banks 7m
  t = toggleSide(t, 'right', t0 + 10 * MINUTE); // pause right at 3m
  assert.equal(t.running, undefined);
  assert.deepEqual(timerElapsed(t, t0 + 60 * MINUTE), { left: 7 * MINUTE, right: 3 * MINUTE, total: 10 * MINUTE });
  assert.deepEqual(finishTimer(t, t0 + 60 * MINUTE), { leftMin: 7, rightMin: 3, durationMin: 10, side: 'both' });
  assert.equal(formatClock(7 * MINUTE + 12_000), '07:12');
  assert.equal(formatClock(HOUR + 2 * MINUTE + 5_000), '1:02:05');
});

test('predictNextNap averages recent awake windows', () => {
  const sleeps = [
    ev({ type: 'sleep', start: at(27, 6), end: at(27, 7) }),
    ev({ type: 'sleep', start: at(27, 8, 30), end: at(27, 9) }), // 1.5h window
    ev({ type: 'sleep', start: at(27, 10, 30), end: at(27, 11) }), // 1.5h
    ev({ type: 'sleep', start: at(27, 13), end: at(27, 14) }), // 2h
  ];
  const pred = predictNextNap(sleeps, at(27, 14, 30));
  assert.ok(pred);
  assert.equal(pred.samples, 3);
  assert.equal(pred.windowMs, (5 / 3) * HOUR);
  assert.equal(pred.at, at(27, 14) + (5 / 3) * HOUR);
  // no prediction while asleep, or with too little data
  assert.equal(predictNextNap([...sleeps, ev({ type: 'sleep', start: at(27, 15) })], at(27, 16)), undefined);
  assert.equal(predictNextNap(sleeps.slice(0, 3), at(27, 14, 30)), undefined);
});

test('dailySeries returns oldest-first days ending on lastDay', () => {
  const events = [ev({ type: 'diaper', start: at(26, 9), diaper: 'wet' })];
  const series = dailySeries(events, at(27, 12), 3, at(27, 12));
  assert.deepEqual(series.map((d) => dayKey(d.day)), ['2026-09-25', '2026-09-26', '2026-09-27']);
  assert.deepEqual(series.map((d) => d.summary.diapers), [0, 1, 0]);
});

test('recommendedSleepHours by age', () => {
  assert.deepEqual(recommendedSleepHours(30), [14, 17]);
  assert.deepEqual(recommendedSleepHours(200), [12, 15]);
});

test('describeEvent for breast sides and growth', () => {
  assert.equal(describeEvent(ev({ type: 'feed', start: 0, method: 'breast', leftMin: 7, rightMin: 3 })), 'הנקה · שמאל 7\u00A0ד׳ · ימין 3\u00A0ד׳');
  assert.equal(describeEvent(ev({ type: 'feed', start: 0, method: 'breast', breastTimer: { leftMs: 0, rightMs: 0 } })), 'הנקה · בתהליך');
  assert.equal(describeEvent(ev({ type: 'growth', start: 0, weightKg: 4.2, headCm: 38 })), '4.2 ק״ג · היקף ראש 38 ס״מ');
});

test('backup round-trip and validation', async () => {
  const { parseBackup, serializeBackup } = await import('../src/lib/backup.ts');
  const events = [ev({ type: 'diaper', start: at(27, 9), diaper: 'wet' })];
  const back = parseBackup(serializeBackup({ profile: { name: 'Tom', birthDate: at(1, 0) }, events }));
  assert.deepEqual(back.events, events);
  assert.deepEqual(back.profile, { name: 'Tom', birthDate: at(1, 0) });
  assert.throws(() => parseBackup('hello'), /JSON לא תקין/);
  assert.throws(() => parseBackup('{"events":[{"id":"x","type":"bogus","start":1}]}'), /פגומות/);
});

test('Hebrew dates', async () => {
  const { formatDate, formatAgo, shortDate } = await import('../src/lib/time.ts');
  assert.equal(formatDate(at(27, 9), at(27, 20)), 'היום');
  assert.equal(formatDate(at(26, 9), at(27, 20)), 'אתמול');
  assert.equal(formatDate(at(24, 9), at(27, 20)), 'יום ה׳, 24 בספט׳');
  assert.equal(shortDate(at(3, 9)), '3 בספט׳');
  assert.equal(formatAgo(at(27, 9), at(27, 11, 5)), 'לפני 2\u00A0ש׳ 5\u00A0ד׳');
});
