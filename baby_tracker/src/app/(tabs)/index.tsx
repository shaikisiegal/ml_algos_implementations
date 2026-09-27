import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EventRow } from '../../components/EventRow';
import { SummaryChips } from '../../components/SummaryChips';
import { describeEvent } from '../../lib/describe';
import { successFeedback, tapFeedback } from '../../lib/feedback';
import { eventsForDay, lastOfType, ongoingSleep, summarizeDay } from '../../lib/stats';
import { useStore } from '../../lib/store';
import { tint, usePalette } from '../../lib/theme';
import { MINUTE, formatAge, formatDuration } from '../../lib/time';
import { EVENT_TYPES, TYPE_META, type BabyEvent, type EventType } from '../../lib/types';
import { useNow } from '../../lib/useNow';

export default function TodayScreen() {
  const p = usePalette();
  const { events, profile, addEvent, updateEvent, ready } = useStore();
  const now = useNow();

  const sleeping = ongoingSleep(events);
  const today = eventsForDay(events, now, now);
  const summary = summarizeDay(events, now, now);

  const openForm = (params: { type?: EventType; id?: string }) => router.push({ pathname: '/event', params });

  const onTile = (type: EventType) => {
    if (type !== 'sleep') return openForm({ type });
    // Sleep is a one-tap toggle: start now / wake up now.
    successFeedback();
    if (sleeping) updateEvent(sleeping.id, { end: Date.now() });
    else addEvent({ type: 'sleep', start: Date.now() });
  };

  const lastFeed = lastOfType(events, 'feed');
  const lastDiaper = lastOfType(events, 'diaper');
  const lastSleep = lastOfType(events, 'sleep');

  if (!ready) return <View style={[styles.flex, { backgroundColor: p.bg }]} />;

  return (
    <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={styles.content}>
      <Text style={[styles.hello, { color: p.text }]}>{profile.name ? `${profile.name} 👶` : 'Hello, little one 👶'}</Text>
      {profile.birthDate ? <Text style={[styles.age, { color: p.muted }]}>{formatAge(profile.birthDate, now)}</Text> : null}

      {sleeping ? (
        <Pressable
          onPress={() => onTile('sleep')}
          style={[styles.banner, { backgroundColor: tint(TYPE_META.sleep.color, 0.15), borderColor: TYPE_META.sleep.color }]}
        >
          <Text style={[styles.bannerTitle, { color: TYPE_META.sleep.color }]}>
            😴 Sleeping for {formatDuration(now - sleeping.start)}
          </Text>
          <Text style={[styles.bannerSub, { color: p.text }]}>Tap to log wake-up</Text>
        </Pressable>
      ) : null}

      <View style={styles.lastRow}>
        <LastCard type="feed" event={lastFeed} now={now} onPress={() => lastFeed && openForm({ id: lastFeed.id })} />
        <LastCard type="diaper" event={lastDiaper} now={now} onPress={() => lastDiaper && openForm({ id: lastDiaper.id })} />
        <LastCard
          type="sleep"
          event={lastSleep}
          now={now}
          onPress={() => lastSleep && openForm({ id: lastSleep.id })}
          override={
            sleeping
              ? { big: formatDuration(now - sleeping.start), small: 'asleep' }
              : lastSleep?.end !== undefined
                ? { big: formatDuration(now - lastSleep.end), small: 'awake' }
                : undefined
          }
        />
      </View>

      <Text style={[styles.section, { color: p.muted }]}>QUICK ADD</Text>
      <View style={styles.grid}>
        {EVENT_TYPES.map((type) => {
          const meta = TYPE_META[type];
          const label = type === 'sleep' ? (sleeping ? 'Wake up' : 'Start sleep') : meta.label;
          const emoji = type === 'sleep' && sleeping ? '🌅' : meta.emoji;
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => onTile(type)}
              onLongPress={() => {
                tapFeedback();
                openForm({ type });
              }}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: tint(meta.color, 0.14), borderColor: tint(meta.color, 0.35) },
                pressed && { transform: [{ scale: 0.96 }] },
              ]}
            >
              <Text style={styles.tileEmoji}>{emoji}</Text>
              <Text style={[styles.tileLabel, { color: p.text }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: p.muted }]}>Tip: long-press Sleep to enter a past nap manually.</Text>

      <Text style={[styles.section, { color: p.muted }]}>TODAY</Text>
      <SummaryChips summary={summary} />

      <View style={{ marginTop: 12 }}>
        {today.length === 0 ? (
          <Text style={[styles.empty, { color: p.muted }]}>Nothing logged yet today. Tap a button above to start.</Text>
        ) : (
          today.map((e) => <EventRow key={e.id} event={e} now={now} onPress={() => openForm({ id: e.id })} />)
        )}
      </View>
    </ScrollView>
  );
}

function LastCard({
  type,
  event,
  now,
  onPress,
  override,
}: {
  type: EventType;
  event?: BabyEvent;
  now: number;
  onPress: () => void;
  override?: { big: string; small: string };
}) {
  const p = usePalette();
  const meta = TYPE_META[type];
  const justNow = event && now - event.start < MINUTE;
  const big = override?.big ?? (event ? (justNow ? 'Just now' : formatDuration(now - event.start)) : '—');
  const small = override?.small ?? (event ? (justNow ? ' ' : 'ago') : 'no data');
  return (
    <Pressable onPress={onPress} style={[styles.lastCard, { backgroundColor: p.card, borderColor: p.border }]}>
      <Text style={[styles.lastTitle, { color: meta.color }]}>
        {meta.emoji} {meta.label}
      </Text>
      <Text style={[styles.lastBig, { color: p.text }]}>{big}</Text>
      <Text style={[styles.lastSmall, { color: p.muted }]} numberOfLines={1}>
        {small}
      </Text>
      {event && type !== 'sleep' ? (
        <Text style={[styles.lastDetail, { color: p.muted }]} numberOfLines={1}>
          {describeEvent(event, now)}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  hello: { fontSize: 26, fontWeight: '800' },
  age: { fontSize: 15, marginTop: 2 },
  banner: { marginTop: 14, padding: 14, borderRadius: 16, borderWidth: 2 },
  bannerTitle: { fontSize: 18, fontWeight: '700' },
  bannerSub: { fontSize: 14, marginTop: 2 },
  lastRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  lastCard: { flex: 1, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  lastTitle: { fontSize: 13, fontWeight: '700' },
  lastBig: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  lastSmall: { fontSize: 12 },
  lastDetail: { fontSize: 12, marginTop: 4 },
  section: { fontSize: 13, fontWeight: '700', letterSpacing: 1, marginTop: 22, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '31%',
    flexGrow: 1,
    aspectRatio: 1.1,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileEmoji: { fontSize: 34 },
  tileLabel: { fontSize: 15, fontWeight: '700', marginTop: 6 },
  hint: { fontSize: 12, marginTop: 8 },
  empty: { fontSize: 15, textAlign: 'center', paddingVertical: 20 },
});
