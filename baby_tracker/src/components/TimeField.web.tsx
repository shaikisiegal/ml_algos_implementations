import { usePalette } from '../lib/theme.ts';
import type { TimeFieldProps } from './TimeField';

const pad = (n: number) => String(n).padStart(2, '0');

function toLocalInput(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Web fallback (used for browser previews) — a plain datetime-local input. */
export function TimeField({ value, onChange, mode = 'datetime' }: TimeFieldProps) {
  const p = usePalette();
  return (
    <input
      type={mode === 'date' ? 'date' : 'datetime-local'}
      value={mode === 'date' ? toLocalInput(value).slice(0, 10) : toLocalInput(value)}
      onChange={(e) => {
        const raw = mode === 'date' ? `${e.target.value}T12:00` : e.target.value;
        const t = new Date(raw).getTime();
        if (!Number.isNaN(t)) onChange(t);
      }}
      style={{
        fontSize: 16,
        padding: 10,
        borderRadius: 10,
        border: `1px solid ${p.border}`,
        background: p.chip,
        color: p.text,
        alignSelf: 'flex-start',
      }}
    />
  );
}
