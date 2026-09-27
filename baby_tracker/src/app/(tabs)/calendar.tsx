import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EventRow } from '../../components/EventRow';
import { SummaryChips } from '../../components/SummaryChips';
import { tapFeedback } from '../../lib/feedback';
import { eventsForDay, summarizeDay, typesByDay } from '../../lib/stats';
import { useStore } from '../../lib/store';
import { tint, usePalette } from '../../lib/theme';
import { MONTHS, dayKey, formatDate, isSameDay, startOfDay } from '../../lib/time';
import { EVENT_TYPES, TYPE_META } from '../../lib/types';
import { useNow } from '../../lib/useNow';

const WEEK_HEADER = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

/** 6×7 grid of dates covering the month (Sunday first). */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export default function CalendarScreen() {
  const p = usePalette();
  const { events } = useStore();
  const now = useNow();

  const [selected, setSelected] = useState(() => startOfDay(Date.now()));
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const dots = useMemo(() => typesByDay(events, dayKey), [events]);
  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const dayEvents = eventsForDay(events, selected, now);
  const summary = summarizeDay(events, selected, now);

  const shiftMonth = (delta: number) => {
    tapFeedback();
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToday = () => {
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(startOfDay(d));
  };

  // New events on a past day default to the current time-of-day on that day.
  const addOnSelected = () => {
    const t = new Date();
    const s = new Date(selected);
    s.setHours(t.getHours(), t.getMinutes(), 0, 0);
    router.push({ pathname: '/event', params: { at: String(s.getTime()) } });
  };

  return (
    <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} style={styles.navBtn} accessibilityLabel="החודש הקודם">
            <Text style={[styles.nav, { color: p.accent }]}>‹</Text>
          </Pressable>
          <Pressable onPress={goToday}>
            <Text style={[styles.monthTitle, { color: p.text }]}>
              {MONTHS[cursor.month]} {cursor.year}
            </Text>
          </Pressable>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={12} style={styles.navBtn} accessibilityLabel="החודש הבא">
            <Text style={[styles.nav, { color: p.accent }]}>›</Text>
          </Pressable>
        </View>

        <View style={styles.week}>
          {WEEK_HEADER.map((d, i) => (
            <Text key={i} style={[styles.weekDay, { color: p.muted }]}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((d) => {
            const inMonth = d.getMonth() === cursor.month;
            const isSel = isSameDay(d, selected);
            const isToday = isSameDay(d, now);
            const types = dots.get(dayKey(d));
            return (
              <Pressable
                key={d.getTime()}
                accessibilityLabel={formatDate(d.getTime(), now)}
                onPress={() => {
                  tapFeedback();
                  setSelected(startOfDay(d));
                  if (!inMonth) setCursor({ year: d.getFullYear(), month: d.getMonth() });
                }}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSel && { backgroundColor: p.accent },
                    !isSel && isToday && { borderColor: p.accent, borderWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      { color: isSel ? '#fff' : inMonth ? p.text : p.muted },
                      !inMonth && { opacity: 0.4 },
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </View>
                <View style={styles.dots}>
                  {types
                    ? EVENT_TYPES.filter((t) => types.has(t))
                        .slice(0, 4)
                        .map((t) => <View key={t} style={[styles.dot, { backgroundColor: p.types[t] }]} />)
                    : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.dayHeader}>
        <Text style={[styles.dayTitle, { color: p.text }]}>{formatDate(selected, now)}</Text>
        <Pressable
          onPress={addOnSelected}
          style={({ pressed }) => [styles.addBtn, { backgroundColor: tint(p.accent, 0.15) }, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.addText, { color: p.accent }]}>＋ הוספה</Text>
        </Pressable>
      </View>

      <SummaryChips summary={summary} />

      <View style={{ marginTop: 12 }}>
        {dayEvents.length === 0 ? (
          <Text style={[styles.empty, { color: p.muted }]}>אין אירועים ביום הזה.</Text>
        ) : (
          dayEvents.map((e) => (
            <EventRow key={e.id} event={e} now={now} onPress={() => router.push({ pathname: '/event', params: { id: e.id } })} />
          ))
        )}
      </View>
      <Text style={[styles.hint, { color: p.muted }]}>הקישו על אירוע כדי לערוך או למחוק.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 18, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn: { paddingHorizontal: 12 },
  nav: { fontSize: 30, fontWeight: '600' },
  monthTitle: { fontSize: 18, fontWeight: '700' },
  week: { flexDirection: 'row' },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 15, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  dayTitle: { fontSize: 20, fontWeight: '800' },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  addText: { fontSize: 15, fontWeight: '700' },
  empty: { fontSize: 15, textAlign: 'center', paddingVertical: 20 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
