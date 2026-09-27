import { formatDuration } from './time.ts';
import { DIAPER_META, STOOL_COLORS, TYPE_META, type BabyEvent } from './types.ts';

const MILK_LABEL = { formula: 'תמ״ל', breastmilk: 'חלב אם' } as const;
const SIDE_LABEL = { left: 'שמאל', right: 'ימין', both: 'שני הצדדים' } as const;

/** Short title for an event row, e.g. "בקבוק · 120 מ״ל תמ״ל". */
export function describeEvent(e: BabyEvent, now: number = Date.now()): string {
  switch (e.type) {
    case 'feed': {
      if (e.method === 'bottle') {
        const parts = ['בקבוק'];
        if (e.amountMl) parts.push(`${e.amountMl} מ״ל${e.milk ? ` ${MILK_LABEL[e.milk]}` : ''}`);
        return parts.join(' · ');
      }
      if (e.method === 'breast') {
        if (e.breastTimer) return 'הנקה · בתהליך';
        const parts = ['הנקה'];
        if (e.leftMin === 0 && e.rightMin === 0) return 'הנקה · פחות מדקה';
        if (e.leftMin || e.rightMin) {
          parts.push(`שמאל ${e.leftMin ?? 0}\u00A0ד׳ · ימין ${e.rightMin ?? 0}\u00A0ד׳`);
          return parts.join(' · ');
        }
        if (e.side) parts.push(SIDE_LABEL[e.side]);
        if (e.durationMin) parts.push(`${e.durationMin}\u00A0ד׳`);
        return parts.join(' · ');
      }
      if (e.method === 'solids') return e.food ? `מוצקים · ${e.food}` : 'מוצקים';
      return TYPE_META.feed.label;
    }
    case 'diaper': {
      if (!e.diaper) return TYPE_META.diaper.label;
      const kind = DIAPER_META[e.diaper];
      const color = e.color && (e.diaper === 'dirty' || e.diaper === 'mixed') ? ` · ${STOOL_COLORS[e.color].label}` : '';
      return `${kind.emoji} ${kind.label}${color}`;
    }
    case 'sleep':
      return e.end === undefined
        ? `ישן/ה · ${formatDuration(now - e.start)} עד עכשיו`
        : `שינה של ${formatDuration(e.end - e.start)}`;
    case 'medicine':
      return [e.medName || TYPE_META.medicine.label, e.dose].filter(Boolean).join(' · ');
    case 'bath':
      return TYPE_META.bath.label;
    case 'growth': {
      const parts = [
        e.weightKg !== undefined ? `${e.weightKg} ק״ג` : '',
        e.heightCm !== undefined ? `${e.heightCm} ס״מ` : '',
        e.headCm !== undefined ? `היקף ראש ${e.headCm} ס״מ` : '',
      ].filter(Boolean);
      return parts.length ? parts.join(' · ') : TYPE_META.growth.label;
    }
    case 'note':
      return e.note ? e.note.split('\n')[0] : TYPE_META.note.label;
  }
}
