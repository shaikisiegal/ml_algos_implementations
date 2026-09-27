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

/** Short Hebrew weekday letters, Sunday first: א׳ … ש׳. */
export const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
export const MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
export const MONTHS_SHORT = [
  'ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני',
  'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳',
];

/** "24 בספט׳" */
export function shortDate(t: number): string {
  const d = new Date(t);
  return `${d.getDate()} ב${MONTHS_SHORT[d.getMonth()]}`;
}

/** "היום", "אתמול", or "יום ה׳, 24 בספט׳". */
export function formatDate(t: number, now: number = Date.now()): string {
  if (isSameDay(t, now)) return 'היום';
  if (isSameDay(t, now - DAY)) return 'אתמול';
  return `יום ${WEEKDAYS[new Date(t).getDay()]}, ${shortDate(t)}`;
}

/** "1 ש׳ 25 ד׳", "45 ד׳", "0 ד׳" (שעות / דקות). */
export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / MINUTE));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  // non-breaking space inside each "number unit" pair, so a wrap never splits them
  if (h === 0) return `${m}\u00A0ד׳`;
  return m === 0 ? `${h}\u00A0ש׳` : `${h}\u00A0ש׳ ${m}\u00A0ד׳`;
}

/** "עכשיו", "לפני 12 ד׳". */
export function formatAgo(t: number, now: number = Date.now()): string {
  const diff = now - t;
  if (diff < MINUTE) return 'עכשיו';
  return `לפני ${formatDuration(diff)}`;
}

/** Whole days between two dates (calendar days, DST-safe). */
export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY);
}

/** Baby age like "2 ח׳ 20 י׳ (שבוע 12)" or "12 ימים (שבוע 2)". Week 1 = first 7 days of life. */
export function formatAge(birth: number, now: number = Date.now()): string {
  const days = daysBetween(birth, now);
  if (days < 0) return '';
  const b = new Date(birth);
  const n = new Date(now);
  let months = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth();
  if (n.getDate() < b.getDate()) months -= 1;
  const monthAnchor = new Date(b.getFullYear(), b.getMonth() + months, b.getDate()).getTime();
  const restDays = daysBetween(monthAnchor, now);
  const week = Math.floor(days / 7) + 1;
  if (months >= 24) return `${Math.floor(months / 12)} שנים ו-${months % 12} ח׳`;
  const main = months > 0 ? `${months} ח׳ ${restDays} י׳` : `${days} ${days === 1 ? 'יום' : 'ימים'}`;
  return `${main} (שבוע ${week})`;
}

/** "ב׳" + "01" labels for day rows. */
export function shortDay(t: number): { weekday: string; date: string } {
  const d = new Date(t);
  return { weekday: WEEKDAYS[d.getDay()], date: String(d.getDate()).padStart(2, '0') };
}

/** Add `n` calendar days (DST-safe). */
export function addDays(t: number, n: number): number {
  const d = new Date(startOfDay(t));
  d.setDate(d.getDate() + n);
  return d.getTime();
}
