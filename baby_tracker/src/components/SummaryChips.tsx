import { StyleSheet, Text, View } from 'react-native';

import type { DaySummary } from '../lib/stats.ts';
import { tint, usePalette } from '../lib/theme.ts';
import { formatDuration } from '../lib/time.ts';

/** Compact per-day totals: feeds / ml, diapers wet+dirty, sleep total. */
export function SummaryChips({ summary: s }: { summary: DaySummary }) {
  const p = usePalette();
  const items = [
    {
      color: p.types.feed,
      big: `${s.feeds}`,
      label: s.feeds === 1 ? 'האכלה' : 'האכלות',
      sub: s.bottleMl ? `${s.bottleMl} מ״ל` : '',
    },
    {
      color: p.types.diaper,
      big: `${s.diapers}`,
      label: s.diapers === 1 ? 'חיתול' : 'חיתולים',
      sub: s.diapers ? `💧${s.wet}  💩${s.dirty}` : '',
    },
    {
      color: p.types.sleep,
      big: formatDuration(s.sleepMs),
      label: 'שינה',
      sub: s.naps ? `${s.naps} ${s.naps === 1 ? 'שינה' : 'שינות'}` : '',
    },
  ];
  return (
    <View style={styles.row}>
      {items.map((it) => (
        <Stat key={it.label} {...it} />
      ))}
    </View>
  );
}

function Stat({ color, big, label, sub }: { color: string; big: string; label: string; sub: string }) {
  const p = usePalette();
  return (
    <View style={[styles.stat, { backgroundColor: tint(color, 0.1) }]}>
      <Text style={[styles.big, { color: p.text }]}>{big}</Text>
      <View style={styles.labelRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.label, { color: p.text }]}>{label}</Text>
      </View>
      {sub ? <Text style={[styles.sub, { color: p.muted }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 10, borderRadius: 14 },
  big: { fontSize: 20, fontWeight: '800' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
});
