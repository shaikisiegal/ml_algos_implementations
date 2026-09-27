export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function startOfDay(t: number | Date): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Start of the next calendar day (DST-safe, unlike adding 24h). */
export function startOfNextDay(t: number | Date): number {
  const d = new Date(startOfDay(t));
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

/** Local-date key, e.g. "2026-09-27". */
export function dayKey(t: number | Date): string {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function isSameDay(a: number | Date, b: number | Date): boolean {
  return dayKey(a) === dayKey(b);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatTime(t: number): string {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDate(t: number, now: number = Date.now()): string {
  if (isSameDay(t, now)) return 'Today';
  if (isSameDay(t, now - DAY)) return 'Yesterday';
  const d = new Date(t);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** "1h 25m", "45m", "0m". */
export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / MINUTE));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "just now", "12m ago", "2h 5m ago". */
export function formatAgo(t: number, now: number = Date.now()): string {
  const diff = now - t;
  if (diff < MINUTE) return 'just now';
  return `${formatDuration(diff)} ago`;
}

/** "5 days", "3 weeks", "2 months" — used for the baby's age. */
export function formatAge(birth: number, now: number = Date.now()): string {
  const days = Math.floor((startOfDay(now) - startOfDay(birth)) / DAY);
  if (days < 0) return '';
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} old`;
  if (days < 90) {
    const w = Math.floor(days / 7);
    const d = days % 7;
    return `${w} weeks${d ? ` ${d}d` : ''} old`;
  }
  const b = new Date(birth);
  const n = new Date(now);
  let months = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth();
  if (n.getDate() < b.getDate()) months -= 1;
  return `${months} months old`;
}
