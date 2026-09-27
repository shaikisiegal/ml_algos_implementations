import { Pressable, StyleSheet, Text, View } from 'react-native';

import { describeEvent } from '../lib/describe.ts';
import { tint, usePalette } from '../lib/theme.ts';
import { formatTime } from '../lib/time.ts';
import { TYPE_META, type BabyEvent } from '../lib/types.ts';

export function EventRow({ event, onPress, now }: { event: BabyEvent; onPress: () => void; now: number }) {
  const p = usePalette();
  const meta = TYPE_META[event.type];
  const time =
    event.type === 'sleep'
      ? `${formatTime(event.start)} – ${event.end !== undefined ? formatTime(event.end) : 'now'}`
      : formatTime(event.start);
  const extraNote = event.type !== 'note' && event.note ? event.note : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: p.card, borderColor: p.border }, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.icon, { backgroundColor: tint(meta.color, 0.16) }]}>
        <Text style={styles.emoji}>{meta.emoji}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: p.text }]} numberOfLines={1}>
          {describeEvent(event, now)}
        </Text>
        {extraNote ? (
          <Text style={[styles.note, { color: p.muted }]} numberOfLines={1}>
            {extraNote}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.time, { color: p.muted }]}>{time}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    gap: 12,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20 },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  note: { fontSize: 13, marginTop: 2 },
  time: { fontSize: 14, fontVariant: ['tabular-nums'] },
});
