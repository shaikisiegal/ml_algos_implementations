import { formatDuration } from './time.ts';
import { DIAPER_META, STOOL_COLORS, TYPE_META, type BabyEvent } from './types.ts';

const MILK_LABEL = { formula: 'formula', breastmilk: 'breast milk' } as const;
const SIDE_LABEL = { left: 'left', right: 'right', both: 'both sides' } as const;

/** Short human title for an event row, e.g. "Bottle · 120 ml formula". */
export function describeEvent(e: BabyEvent, now: number = Date.now()): string {
  switch (e.type) {
    case 'feed': {
      if (e.method === 'bottle') {
        const parts = ['Bottle'];
        if (e.amountMl) parts.push(`${e.amountMl} ml${e.milk ? ` ${MILK_LABEL[e.milk]}` : ''}`);
        return parts.join(' · ');
      }
      if (e.method === 'breast') {
        if (e.breastTimer) return 'Breastfeeding · in progress';
        const parts = ['Breast'];
        if (e.leftMin === 0 && e.rightMin === 0) return 'Breast · <1 min';
        if (e.leftMin || e.rightMin) {
          parts.push(`L ${e.leftMin ?? 0}m · R ${e.rightMin ?? 0}m`);
          return parts.join(' · ');
        }
        if (e.side) parts.push(SIDE_LABEL[e.side]);
        if (e.durationMin) parts.push(`${e.durationMin} min`);
        return parts.join(' · ');
      }
      if (e.method === 'solids') return e.food ? `Solids · ${e.food}` : 'Solids';
      return 'Feed';
    }
    case 'diaper': {
      if (!e.diaper) return 'Diaper';
      const kind = DIAPER_META[e.diaper];
      const color = e.color && (e.diaper === 'dirty' || e.diaper === 'mixed') ? ` · ${STOOL_COLORS[e.color].label.toLowerCase()}` : '';
      return `${kind.emoji} ${kind.label}${color}`;
    }
    case 'sleep':
      return e.end === undefined
        ? `Sleeping · ${formatDuration(now - e.start)} so far`
        : `Slept ${formatDuration(e.end - e.start)}`;
    case 'medicine':
      return [e.medName || 'Medicine', e.dose].filter(Boolean).join(' · ');
    case 'bath':
      return 'Bath';
    case 'growth': {
      const parts = [
        e.weightKg !== undefined ? `${e.weightKg} kg` : '',
        e.heightCm !== undefined ? `${e.heightCm} cm` : '',
        e.headCm !== undefined ? `head ${e.headCm} cm` : '',
      ].filter(Boolean);
      return parts.length ? parts.join(' · ') : 'Growth';
    }
    case 'note':
      return e.note ? e.note.split('\n')[0] : TYPE_META.note.label;
  }
}
