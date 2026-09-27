import type { BabyEvent, BreastSide, BreastTimer, Side } from './types.ts';

/** Elapsed ms per side, including the currently running stretch. */
export function timerElapsed(t: BreastTimer, now: number): { left: number; right: number; total: number } {
  const extra = t.running && t.since !== undefined ? Math.max(0, now - t.since) : 0;
  const left = t.leftMs + (t.running === 'left' ? extra : 0);
  const right = t.rightMs + (t.running === 'right' ? extra : 0);
  return { left, right, total: left + right };
}

/** Bank the running stretch and stop the clock. */
export function pauseTimer(t: BreastTimer, now: number): BreastTimer {
  const { left, right } = timerElapsed(t, now);
  return { leftMs: left, rightMs: right };
}

/** Start (or switch to) a side; the other side is paused automatically. */
export function startSide(t: BreastTimer | undefined, side: Side, now: number): BreastTimer {
  const base = t ? pauseTimer(t, now) : { leftMs: 0, rightMs: 0 };
  return { ...base, running: side, since: now };
}

/** Tapping the running side pauses it; tapping the other side switches. */
export function toggleSide(t: BreastTimer, side: Side, now: number): BreastTimer {
  return t.running === side ? pauseTimer(t, now) : startSide(t, side, now);
}

export function sideFromMinutes(leftMin = 0, rightMin = 0): BreastSide | undefined {
  if (leftMin > 0 && rightMin > 0) return 'both';
  if (leftMin > 0) return 'left';
  if (rightMin > 0) return 'right';
  return undefined;
}

/** Fields that replace `breastTimer` once the session is finished. */
export function finishTimer(t: BreastTimer, now: number): Pick<BabyEvent, 'leftMin' | 'rightMin' | 'durationMin' | 'side'> {
  const { left, right } = timerElapsed(t, now);
  const leftMin = Math.round(left / 60_000);
  const rightMin = Math.round(right / 60_000);
  return { leftMin, rightMin, durationMin: leftMin + rightMin, side: sideFromMinutes(leftMin, rightMin) };
}

/** "07:12" for under an hour, "1:02:05" beyond. */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
