import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LineChart } from '../../components/charts';
import { Chip } from '../../components/Chip';
import { EventRow } from '../../components/EventRow';
import { latestGrowth } from '../../lib/stats';
import { useStore } from '../../lib/store';
import { tint, usePalette } from '../../lib/theme';
import { formatAge, formatDate } from '../../lib/time';
import type { BabyEvent } from '../../lib/types';
import { useNow } from '../../lib/useNow';

type Measure = 'weightKg' | 'heightCm' | 'headCm';

const MEASURES: { key: Measure; label: string; unit: string }[] = [
  { key: 'weightKg', label: 'Weight', unit: 'kg' },
  { key: 'heightCm', label: 'Height', unit: 'cm' },
  { key: 'headCm', label: 'Head size', unit: 'cm' },
];

export default function GrowthScreen() {
  const p = usePalette();
  const { events, profile } = useStore();
  const now = useNow(60_000);
  const [measure, setMeasure] = useState<Measure>('weightKg');
  const latest = latestGrowth(events);
  const color = p.types.growth;

  const history = events.filter((e) => e.type === 'growth').sort((a, b) => b.start - a.start);
  const m = MEASURES.find((x) => x.key === measure)!;
  const points = history
    .filter((e) => e[measure] !== undefined)
    .map((e) => ({ t: e.start, value: e[measure]!, title: formatDate(e.start, now) }))
    .reverse();
  const fmt = (v: number) => `${Math.round(v * 100) / 100} ${m.unit}`;

  const card = (label: string, e: BabyEvent | undefined, key: Measure, unit: string) => (
    <View key={key} style={[styles.tile, { backgroundColor: p.card, borderColor: p.border }]}>
      <Text style={[styles.tileLabel, { color: p.muted }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: p.text }]}>{e ? `${e[key]} ${unit}` : '—'}</Text>
      <Text style={[styles.tileDate, { color: p.muted }]}>{e ? formatDate(e.start, now) : 'not measured'}</Text>
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={styles.content}>
      {profile.birthDate ? (
        <Text style={[styles.age, { color: p.muted }]}>Age: {formatAge(profile.birthDate, now)}</Text>
      ) : null}
      <View style={styles.tiles}>
        {card('Weight', latest.weight, 'weightKg', 'kg')}
        {card('Height', latest.height, 'heightCm', 'cm')}
        {card('Head', latest.head, 'headCm', 'cm')}
      </View>

      <Pressable
        onPress={() => router.push({ pathname: '/event', params: { type: 'growth' } })}
        style={({ pressed }) => [styles.addBtn, { backgroundColor: tint(color, 0.15), borderColor: color }, pressed && { opacity: 0.7 }]}
      >
        <Text style={[styles.addText, { color: p.text }]}>📏 Add measurement</Text>
      </Pressable>

      <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
        <View style={styles.chips}>
          {MEASURES.map((x) => (
            <Chip key={x.key} label={x.label} color={color} selected={measure === x.key} onPress={() => setMeasure(x.key)} />
          ))}
        </View>
        {points.length >= 2 ? (
          <>
            <Text style={[styles.unitNote, { color: p.muted }]}>{m.label} ({m.unit})</Text>
            <LineChart key={measure} points={points} color={color} format={fmt} formatTick={(v) => `${Math.round(v * 10) / 10}`} />
          </>
        ) : (
          <Text style={[styles.empty, { color: p.muted }]}>
            {points.length === 1 ? 'Add one more measurement to see a chart.' : `No ${m.label.toLowerCase()} measurements yet.`}
          </Text>
        )}
      </View>

      <Text style={[styles.section, { color: p.muted }]}>HISTORY</Text>
      {history.length === 0 ? (
        <Text style={[styles.empty, { color: p.muted }]}>Log weight, height and head size after checkups.</Text>
      ) : (
        history.map((e) => (
          <View key={e.id}>
            <Text style={[styles.histDate, { color: p.muted }]}>{formatDate(e.start, now)}</Text>
            <EventRow event={e} now={now} onPress={() => router.push({ pathname: '/event', params: { id: e.id } })} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  age: { fontSize: 15, marginBottom: 10 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  tileLabel: { fontSize: 12, fontWeight: '600' },
  tileValue: { fontSize: 19, fontWeight: '800', marginTop: 4 },
  tileDate: { fontSize: 11, marginTop: 2 },
  addBtn: { marginTop: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' },
  addText: { fontSize: 16, fontWeight: '800' },
  card: { marginTop: 14, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  unitNote: { fontSize: 13, marginTop: 4 },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  section: { fontSize: 13, fontWeight: '700', letterSpacing: 1, marginTop: 22, marginBottom: 6 },
  histDate: { fontSize: 12, marginBottom: 4, marginTop: 4 },
});
