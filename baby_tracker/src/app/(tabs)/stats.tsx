import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarChart, type BarDatum } from '../../components/charts';
import { Chip } from '../../components/Chip';
import { dailySeries, recommendedSleepHours, type DaySummary } from '../../lib/stats';
import { useStore } from '../../lib/store';
import { usePalette } from '../../lib/theme';
import { HOUR, addDays, daysBetween, formatDuration, shortDate, startOfDay } from '../../lib/time';
import type { EventType } from '../../lib/types';
import { useNow } from '../../lib/useNow';

type Metric = 'sleep' | 'feeds' | 'bottle' | 'diapers';

const METRICS: { key: Metric; label: string; type: EventType; value: (s: DaySummary) => number; format: (v: number) => string; unit: string }[] = [
  { key: 'sleep', label: '😴 שינה', type: 'sleep', value: (s) => s.sleepMs / HOUR, format: (v) => formatDuration(v * HOUR), unit: 'שעות שינה ביום' },
  { key: 'feeds', label: '🍼 האכלות', type: 'feed', value: (s) => s.feeds, format: (v) => `${Math.round(v * 10) / 10}`, unit: 'האכלות ביום' },
  { key: 'bottle', label: '🥛 מ״ל בבקבוק', type: 'feed', value: (s) => s.bottleMl, format: (v) => `${Math.round(v)} מ״ל`, unit: 'מ״ל בבקבוק ביום' },
  { key: 'diapers', label: '🧷 חיתולים', type: 'diaper', value: (s) => s.diapers, format: (v) => `${Math.round(v * 10) / 10}`, unit: 'חיתולים ביום' },
];

const RANGES = [7, 14, 30];


/** "14–27 בספט׳", or "28 באוג׳ – 3 בספט׳" across months. */
function rangeLabel(from: number, to: number): string {
  const a = new Date(from);
  const b = new Date(to);
  return a.getMonth() === b.getMonth() ? `${a.getDate()}-${shortDate(to)}` : `${shortDate(from)} – ${shortDate(to)}`;
}

export default function StatsScreen() {
  const p = usePalette();
  const { events, profile } = useStore();
  const now = useNow(60_000);
  const [metric, setMetric] = useState<Metric>('sleep');
  const [range, setRange] = useState(7);
  const [offset, setOffset] = useState(0); // in ranges back from today
  const [showTable, setShowTable] = useState(false);

  const m = METRICS.find((x) => x.key === metric)!;
  const lastDay = addDays(startOfDay(now), -offset * range);
  const series = useMemo(() => dailySeries(events, lastDay, range, now), [events, lastDay, range, now]);

  const values = series.map((d) => m.value(d.summary));
  // Average over complete days that have any data: today is still in progress, and a
  // new baby's empty first days shouldn't drag it down.
  const today = startOfDay(now);
  const withData = series.filter((d) => {
    const s = d.summary;
    if (d.day >= today) return false;
    return s.feeds + s.diapers + s.naps + s.baths > 0 || s.sleepMs > 0;
  });
  const avg = withData.length ? withData.reduce((a, d) => a + m.value(d.summary), 0) / withData.length : 0;
  const total = values.reduce((a, b) => a + b, 0);

  const band =
    metric === 'sleep' && profile.birthDate
      ? recommendedSleepHours(daysBetween(profile.birthDate, lastDay))
      : undefined;

  const data: BarDatum[] = series.map((d) => {
    const s = d.summary;
    const dt = new Date(d.day);
    let detail: string | undefined;
    if (metric === 'diapers') detail = `💧 ${s.wet} רטובים · 💩 ${s.dirty} קקי`;
    if (metric === 'sleep') detail = `${s.naps} ${s.naps === 1 ? 'שינה' : 'שינות'} התחילו`;
    if (metric === 'feeds' && s.bottleMl) detail = `${s.bottleMl} מ״ל`;
    return { label: String(dt.getDate()), title: shortDate(d.day), value: m.value(s), detail };
  });

  return (
    <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={styles.content}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {METRICS.map((x) => (
          <Chip key={x.key} label={x.label} color={p.types[x.type]} selected={metric === x.key} onPress={() => setMetric(x.key)} />
        ))}
      </ScrollView>

      <View style={styles.rangeRow}>
        <Pressable onPress={() => setOffset((o) => o + 1)} hitSlop={12} accessibilityLabel="מוקדם יותר">
          <Text style={[styles.nav, { color: p.accent }]}>‹</Text>
        </Pressable>
        <Text style={[styles.rangeText, { color: p.text }]}>
          {rangeLabel(series[0].day, series[series.length - 1].day)}
        </Text>
        <Pressable
          onPress={() => setOffset((o) => Math.max(0, o - 1))}
          hitSlop={12}
          disabled={offset === 0}
          accessibilityLabel="מאוחר יותר"
        >
          <Text style={[styles.nav, { color: offset === 0 ? p.border : p.accent }]}>›</Text>
        </Pressable>
        <View style={styles.flex} />
        {RANGES.map((r) => (
          <Chip
            key={r}
            label={`${r} ימים`}
            selected={range === r}
            onPress={() => {
              setRange(r);
              setOffset(0);
            }}
          />
        ))}
      </View>

      <View style={styles.tiles}>
        <Tile label="ממוצע ליום" value={withData.length ? m.format(avg) : '—'} />
        <Tile label="סה״כ" value={metric === 'sleep' ? formatDuration(total * HOUR) : m.format(total)} />
        {band ? <Tile label="מומלץ" value={`${band[0]}-${band[1]} ש׳`} /> : null}
      </View>

      <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
        <Text style={[styles.cardTitle, { color: p.text }]}>{m.label.replace(/^\S+ /, '')}</Text>
        <Text style={[styles.cardSub, { color: p.muted }]}>{m.unit}</Text>
        <BarChart
          key={`${metric}-${range}-${offset}`}
          data={data}
          color={p.types[m.type]}
          format={m.format}
          average={avg}
          band={band}
          bandLabel={band ? 'טווח מומלץ' : undefined}
        />
        <Pressable onPress={() => setShowTable((v) => !v)} style={styles.tableToggle}>
          <Text style={[styles.tableToggleText, { color: p.accent }]}>{showTable ? 'הסתרת טבלה' : 'הצגה כטבלה'}</Text>
        </Pressable>
        {showTable
          ? [...data].reverse().map((d) => (
              <View key={d.title} style={[styles.tableRow, { borderColor: p.border }]}>
                <Text style={[styles.tableCell, { color: p.muted }]}>{d.title}</Text>
                <Text style={[styles.tableCell, styles.tableValue, { color: p.text }]}>{m.format(d.value)}</Text>
              </View>
            ))
          : null}
      </View>
      {metric === 'sleep' && !profile.birthDate ? (
        <Text style={[styles.hint, { color: p.muted }]}>הוסיפו תאריך לידה ב-⚙️ כדי לראות את טווח השינה המומלץ.</Text>
      ) : null}
    </ScrollView>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={[styles.tile, { backgroundColor: p.card, borderColor: p.border }]}>
      <Text style={[styles.tileLabel, { color: p.muted }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: p.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  chips: { gap: 8 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  nav: { fontSize: 28, fontWeight: '600', paddingHorizontal: 4 },
  rangeText: { fontSize: 15, fontWeight: '700' },
  tiles: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tile: { flex: 1, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  tileLabel: { fontSize: 12, fontWeight: '600' },
  tileValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  card: { marginTop: 14, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  cardSub: { fontSize: 13, marginBottom: 4 },
  tableToggle: { alignSelf: 'flex-end', marginTop: 8, padding: 4 },
  tableToggleText: { fontSize: 14, fontWeight: '700' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth },
  tableCell: { flex: 1, fontSize: 14 },
  tableValue: { textAlign: 'left', fontWeight: '700', fontVariant: ['tabular-nums'] },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 10 },
});
