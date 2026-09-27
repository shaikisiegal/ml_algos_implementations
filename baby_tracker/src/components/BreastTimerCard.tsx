import { Pressable, StyleSheet, Text, View } from 'react-native';

import { finishTimer, formatClock, timerElapsed, toggleSide } from '../lib/breast.ts';
import { confirm, successFeedback, tapFeedback } from '../lib/feedback.ts';
import { useStore } from '../lib/store';
import { tint, usePalette } from '../lib/theme.ts';
import { formatTime } from '../lib/time.ts';
import type { BabyEvent, Side } from '../lib/types.ts';
import { useNow } from '../lib/useNow';

/** In-progress breastfeeding session: L/R stopwatch, finish or discard. */
export function BreastTimerCard({ event }: { event: BabyEvent }) {
  const p = usePalette();
  const { updateEvent, deleteEvent } = useStore();
  const now = useNow(1000);
  const t = event.breastTimer!;
  const el = timerElapsed(t, now);
  const color = p.types.feed;

  const toggle = (side: Side) => {
    tapFeedback();
    updateEvent(event.id, { breastTimer: toggleSide(t, side, Date.now()) });
  };

  const finish = () => {
    successFeedback();
    updateEvent(event.id, { ...finishTimer(t, Date.now()), breastTimer: undefined });
  };

  const SideButton = ({ side }: { side: Side }) => {
    const running = t.running === side;
    const ms = side === 'left' ? el.left : el.right;
    const letter = side === 'left' ? 'שמאל' : 'ימין';
    return (
      <Pressable
        onPress={() => toggle(side)}
        accessibilityLabel={`${running ? 'עצירה' : 'התחלה'} ${side === 'left' ? 'שמאל' : 'ימין'}`}
        style={({ pressed }) => [
          styles.side,
          running ? { backgroundColor: color, borderColor: color } : { borderColor: color, backgroundColor: p.card },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={[styles.sideLabel, { color: running ? '#fff' : p.text }]}>
          {running ? '❚❚' : '▶'} {letter}
        </Text>
        <Text style={[styles.sideTime, { color: running ? '#fff' : p.text }]}>{formatClock(ms)}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: tint(color, 0.12), borderColor: color }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: p.text }]}>🤱 הנקה</Text>
        <Text style={[styles.total, { color: p.text }]}>{formatClock(el.total)}</Text>
      </View>
      <Text style={[styles.sub, { color: p.muted }]}>
        התחלה {formatTime(event.start)} · {t.running ? `צד ${t.running === 'left' ? 'שמאל' : 'ימין'}` : 'מושהה'}
      </Text>
      <View style={[styles.row, styles.ltr]}>
        <SideButton side="left" />
        <SideButton side="right" />
      </View>
      <View style={styles.row}>
        <Pressable
          onPress={() =>
            confirm('לבטל את ההנקה?', 'הטיימר הפעיל יימחק.', 'ביטול הנקה', () => deleteEvent(event.id))
          }
          style={[styles.secondary, { borderColor: p.border }]}
        >
          <Text style={[styles.secondaryText, { color: p.muted }]}>ביטול</Text>
        </Pressable>
        <Pressable onPress={finish} style={[styles.finish, { backgroundColor: p.text }]}>
          <Text style={[styles.finishText, { color: p.bg }]}>■ סיום ושמירה</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14, padding: 14, borderRadius: 18, borderWidth: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 18, fontWeight: '800' },
  total: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  sub: { fontSize: 13, marginTop: 2 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  ltr: { direction: 'ltr' },
  side: { flex: 1, borderWidth: 2, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  sideLabel: { fontSize: 16, fontWeight: '800' },
  sideTime: { fontSize: 20, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] },
  secondary: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, justifyContent: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  finish: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  finishText: { fontSize: 16, fontWeight: '800' },
});
