import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tint, usePalette } from '../lib/theme.ts';
import { startOfDay, startOfNextDay } from '../lib/time.ts';
import { DIAPER_META, TYPE_META, type BabyEvent, type EventType } from '../lib/types.ts';

const ICON = 18;
export const STRIP_HEIGHT = 62;
const HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

/** Which lane (row inside the strip) an event type is drawn in. */
const LANE_Y: Record<Exclude<EventType, 'sleep'>, number> = {
  feed: 3,
  medicine: 3,
  bath: 3,
  note: 3,
  growth: 3,
  diaper: 23,
};
const SLEEP_Y = 45;

function iconFor(e: BabyEvent): string {
  if (e.type === 'feed') return e.method === 'breast' ? '🤱' : e.method === 'solids' ? '🥣' : '🍼';
  if (e.type === 'diaper' && e.diaper) return e.diaper === 'mixed' ? '💩' : DIAPER_META[e.diaper].emoji;
  return TYPE_META[e.type].emoji;
}

interface Props {
  day: number;
  events: BabyEvent[];
  now: number;
  /** Types to show; all when omitted. */
  visible?: Set<EventType>;
  onPressEvent: (e: BabyEvent) => void;
}

/**
 * One day as a 24h horizontal strip: point events as small icons in lanes,
 * sleep as bars along the bottom (split at midnight), night hours shaded.
 */
export function DayStrip({ day, events, now, visible, onPressEvent }: Props) {
  const p = usePalette();
  const [width, setWidth] = useState(0);
  const from = startOfDay(day);
  const to = startOfNextDay(day);
  const span = to - from;
  const x = (t: number) => ((t - from) / span) * width;
  const isToday = now >= from && now < to;

  const shown = events.filter((e) => {
    if (visible && !visible.has(e.type)) return false;
    if (e.type === 'sleep') return e.start < to && (e.end ?? now) > from;
    return e.start >= from && e.start < to;
  });

  return (
    <View
      style={[styles.strip, { backgroundColor: p.card }]}
      onLayout={(ev) => setWidth(ev.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <>
          {/* night shading 00–06 and 21–24 */}
          <View style={[styles.night, { left: 0, width: width * (6 / 24), backgroundColor: p.grid }]} />
          <View style={[styles.night, { left: width * (21 / 24), width: width * (3 / 24), backgroundColor: p.grid }]} />
          {HOURS.slice(1).map((h) => (
            <View key={h} style={[styles.gridLine, { left: width * (h / 24), backgroundColor: p.border }]} />
          ))}

          {shown
            .filter((e) => e.type === 'sleep')
            .map((e) => {
              const left = x(Math.max(e.start, from));
              const right = x(Math.min(e.end ?? now, to));
              return (
                <Pressable
                  key={e.id}
                  onPress={() => onPressEvent(e)}
                  hitSlop={8}
                  accessibilityLabel={TYPE_META.sleep.label}
                  style={[
                    styles.sleep,
                    {
                      left,
                      width: Math.max(4, right - left),
                      backgroundColor: e.end === undefined ? tint(p.types.sleep, 0.55) : p.types.sleep,
                    },
                  ]}
                />
              );
            })}

          {shown
            .filter((e) => e.type !== 'sleep')
            .map((e) => {
              const color = p.types[e.type];
              const left = Math.min(Math.max(0, x(e.start) - ICON / 2), width - ICON);
              return (
                <Pressable
                  key={e.id}
                  onPress={() => onPressEvent(e)}
                  hitSlop={6}
                  accessibilityLabel={TYPE_META[e.type].label}
                  style={[
                    styles.icon,
                    {
                      left,
                      top: LANE_Y[e.type as Exclude<EventType, 'sleep'>],
                      backgroundColor: tint(color, 0.22),
                      borderColor: p.card,
                    },
                  ]}
                >
                  <Text style={styles.iconText}>{iconFor(e)}</Text>
                </Pressable>
              );
            })}

          {isToday ? <View style={[styles.nowLine, { left: x(now), backgroundColor: p.accent }]} /> : null}
        </>
      ) : null}
    </View>
  );
}

/** Hour labels aligned with DayStrip (render above a column of strips). */
export function HourAxis() {
  const p = usePalette();
  const [width, setWidth] = useState(0);
  return (
    <View style={styles.axis} onLayout={(ev) => setWidth(ev.nativeEvent.layout.width)}>
      {width > 0
        ? HOURS.map((h) => (
            <Text key={h} style={[styles.axisLabel, { left: width * (h / 24) - (h === 0 ? 0 : 8), color: p.muted }]}>
              {h}
            </Text>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Time runs left→right (00 → 24) even in the RTL UI, like a clock/graph axis.
  strip: { height: STRIP_HEIGHT, borderRadius: 8, overflow: 'hidden', direction: 'ltr' },
  night: { position: 'absolute', top: 0, bottom: 0, opacity: 0.8 },
  gridLine: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  sleep: { position: 'absolute', top: SLEEP_Y, height: 12, borderRadius: 4 },
  icon: {
    position: 'absolute',
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 10, lineHeight: 12 },
  nowLine: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  axis: { height: 16, direction: 'ltr' },
  axisLabel: { position: 'absolute', width: 16, textAlign: 'center', fontSize: 11, fontVariant: ['tabular-nums'] },
});
