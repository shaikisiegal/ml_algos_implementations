import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../../components/Chip';
import { DayStrip, HourAxis } from '../../components/DayStrip';
import { useStore } from '../../lib/store';
import { usePalette } from '../../lib/theme';
import { MONTHS, addDays, shortDay, startOfDay } from '../../lib/time';
import { EVENT_TYPES, TYPE_META, type EventType } from '../../lib/types';
import { useNow } from '../../lib/useNow';

const PAGE = 14;
const LABEL_W = 40;

/** Many days stacked as 24h strips, so daily rhythms line up vertically. */
export default function TimelineScreen() {
  const p = usePalette();
  const { events } = useStore();
  const now = useNow();
  const [visible, setVisible] = useState<Set<EventType>>(() => new Set(EVENT_TYPES));
  const [count, setCount] = useState(PAGE);

  const earliest = useMemo(() => events.reduce((m, e) => Math.min(m, e.start), now), [events, now]);
  const today = startOfDay(now);
  const totalDays = Math.max(1, Math.round((today - startOfDay(earliest)) / 86_400_000) + 1);
  const days = useMemo(
    () => Array.from({ length: Math.min(count, totalDays) }, (_, i) => addDays(today, -i)),
    [count, totalDays, today],
  );

  const toggle = (t: EventType) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next.size === 0 ? new Set(EVENT_TYPES) : next;
    });

  return (
    <View style={[styles.flex, { backgroundColor: p.bg }]}>
      <View style={[styles.header, { borderColor: p.border, backgroundColor: p.bg }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {EVENT_TYPES.map((t) => (
            <Chip
              key={t}
              label={`${TYPE_META[t].emoji} ${TYPE_META[t].label}`}
              color={p.types[t]}
              selected={visible.has(t)}
              onPress={() => toggle(t)}
            />
          ))}
        </ScrollView>
        <View style={{ marginLeft: LABEL_W, marginRight: 12 }}>
          <HourAxis />
        </View>
      </View>

      <FlatList
        data={days}
        keyExtractor={(d) => String(d)}
        contentContainerStyle={styles.list}
        onEndReached={() => setCount((c) => (c < totalDays ? c + PAGE : c))}
        onEndReachedThreshold={0.5}
        renderItem={({ item: day, index }) => {
          const d = new Date(day);
          const prev = index > 0 ? new Date(days[index - 1]) : null;
          const newMonth = index === 0 || (prev && prev.getMonth() !== d.getMonth());
          const { weekday, date } = shortDay(day);
          const isToday = day === today;
          return (
            <View>
              {newMonth ? (
                <Text style={[styles.month, { color: p.muted }]}>
                  {MONTHS[d.getMonth()]} {d.getFullYear()}
                </Text>
              ) : null}
              <View style={styles.row}>
                <View style={styles.label}>
                  <Text style={[styles.weekday, { color: isToday ? p.accent : p.muted }]}>{weekday}</Text>
                  <Text style={[styles.date, { color: isToday ? p.accent : p.text }]}>{date}</Text>
                </View>
                <View style={styles.flex}>
                  <DayStrip
                    day={day}
                    events={events}
                    now={now}
                    visible={visible}
                    onPressEvent={(e) => router.push({ pathname: '/event', params: { id: e.id } })}
                  />
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <Text style={[styles.footer, { color: p.muted }]}>
            {events.length === 0 ? 'Your timeline fills up as you log events.' : 'Tap an icon or sleep bar to edit it.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: 10, paddingBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  filters: { gap: 8, paddingHorizontal: 12, paddingBottom: 10 },
  list: { paddingHorizontal: 12, paddingBottom: 30 },
  month: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 12, marginBottom: 4, marginLeft: LABEL_W },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  label: { width: LABEL_W, alignItems: 'center' },
  weekday: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  footer: { textAlign: 'center', fontSize: 12, marginTop: 16 },
});
