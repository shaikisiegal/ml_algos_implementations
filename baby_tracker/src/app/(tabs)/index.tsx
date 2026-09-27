import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BreastTimerCard } from '../../components/BreastTimerCard';
import { DayStrip, HourAxis } from '../../components/DayStrip';
import { EventRow } from '../../components/EventRow';
import { SummaryChips } from '../../components/SummaryChips';
import { describeEvent } from '../../lib/describe';
import { successFeedback, tapFeedback } from '../../lib/feedback';
import { eventsForDay, lastOfType, ongoingBreast, ongoingSleep, predictNextNap, summarizeDay } from '../../lib/stats';
import { useStore } from '../../lib/store';
import { tint, usePalette } from '../../lib/theme';
import { MINUTE, formatAge, formatDuration, formatTime } from '../../lib/time';
import { TYPE_META, type BabyEvent, type EventType, type FeedMethod } from '../../lib/types';
import { useNow } from '../../lib/useNow';

type QuickKey = 'breast' | 'bottle' | Exclude<EventType, 'feed'>;

const QUICK: { key: QuickKey; label: string; emoji: string; type: EventType }[] = [
  { key: 'breast', label: 'הנקה', emoji: '🤱', type: 'feed' },
  { key: 'bottle', label: 'בקבוק', emoji: '🍼', type: 'feed' },
  { key: 'diaper', label: 'חיתול', emoji: '🧷', type: 'diaper' },
  { key: 'sleep', label: 'שינה', emoji: '😴', type: 'sleep' },
  { key: 'bath', label: 'מקלחת', emoji: '🛁', type: 'bath' },
  { key: 'medicine', label: 'תרופה', emoji: '💊', type: 'medicine' },
  { key: 'growth', label: 'גדילה', emoji: '📏', type: 'growth' },
  { key: 'note', label: 'הערה', emoji: '📝', type: 'note' },
];

export default function HomeScreen() {
  const p = usePalette();
  const { events, profile, addEvent, updateEvent, ready } = useStore();
  const now = useNow();

  const sleeping = ongoingSleep(events);
  const breast = ongoingBreast(events);
  const prediction = predictNextNap(events, now);
  const today = eventsForDay(events, now, now);
  const summary = summarizeDay(events, now, now);

  const openForm = (params: { type?: EventType; id?: string; method?: FeedMethod }) =>
    router.push({ pathname: '/event', params });
  const openEvent = (e: BabyEvent) => openForm({ id: e.id });

  const onQuick = (key: QuickKey) => {
    if (key === 'sleep') {
      // One-tap toggle: start now / wake up now.
      successFeedback();
      if (sleeping) updateEvent(sleeping.id, { end: Date.now() });
      else addEvent({ type: 'sleep', start: Date.now() });
      return;
    }
    if (key === 'breast') {
      // Opens a paused stopwatch; the card below starts the chosen side.
      if (!breast) {
        tapFeedback();
        addEvent({ type: 'feed', method: 'breast', start: Date.now(), breastTimer: { leftMs: 0, rightMs: 0 } });
      }
      return;
    }
    if (key === 'bottle') return openForm({ type: 'feed', method: 'bottle' });
    openForm({ type: key });
  };

  const onQuickLong = (key: QuickKey) => {
    tapFeedback();
    if (key === 'breast' || key === 'bottle') openForm({ type: 'feed', method: key });
    else openForm({ type: key });
  };

  const lastFeed = lastOfType(
    events.filter((e) => !e.breastTimer),
    'feed',
  );
  const lastDiaper = lastOfType(events, 'diaper');
  const lastSleep = lastOfType(events, 'sleep');

  if (!ready) return <View style={[styles.flex, { backgroundColor: p.bg }]} />;

  return (
    <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.push('/settings')}>
        <Text style={[styles.hello, { color: p.text }]}>{profile.name ? `${profile.name} 👶` : 'שלום, קטנטן/ה 👶'}</Text>
        <Text style={[styles.age, { color: p.muted }]}>
          {profile.birthDate ? `גיל: ${formatAge(profile.birthDate, now)}` : 'הקישו כדי להוסיף שם ותאריך לידה'}
        </Text>
      </Pressable>

      <View style={styles.quickGrid}>
        {QUICK.map((q) => {
          const color = p.types[q.type];
          const active = (q.key === 'sleep' && !!sleeping) || (q.key === 'breast' && !!breast);
          const label = q.key === 'sleep' && sleeping ? 'התעוררות' : q.label;
          const emoji = q.key === 'sleep' && sleeping ? '🌅' : q.emoji;
          return (
            <Pressable
              key={q.key}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => onQuick(q.key)}
              onLongPress={() => onQuickLong(q.key)}
              style={({ pressed }) => [styles.quick, pressed && { transform: [{ scale: 0.94 }] }]}
            >
              <View
                style={[
                  styles.circle,
                  { backgroundColor: active ? color : tint(color, 0.18), borderColor: color },
                ]}
              >
                <Text style={styles.circleEmoji}>{emoji}</Text>
              </View>
              <Text style={[styles.quickLabel, { color: p.text }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: p.muted }]}>לחיצה ארוכה על כפתור — להזנת אירוע שכבר קרה.</Text>

      {breast ? <BreastTimerCard event={breast} /> : null}

      {sleeping ? (
        <Pressable
          onPress={() => onQuick('sleep')}
          style={[styles.banner, { backgroundColor: tint(p.types.sleep, 0.14), borderColor: p.types.sleep }]}
        >
          <Text style={[styles.bannerTitle, { color: p.text }]}>😴 ישן/ה כבר {formatDuration(now - sleeping.start)}</Text>
          <Text style={[styles.bannerSub, { color: p.muted }]}>מאז {formatTime(sleeping.start)} · הקישו כשהתעורר/ה</Text>
        </Pressable>
      ) : prediction ? (
        <View style={[styles.predict, { borderColor: p.types.sleep, backgroundColor: tint(p.types.sleep, 0.06) }]}>
          <Text style={[styles.predictTitle, { color: p.text }]}>
            🛏️ שינה צפויה: {formatTime(prediction.at)}
          </Text>
          <Text style={[styles.bannerSub, { color: p.muted }]}>
            {prediction.at > now
              ? `בעוד ${formatDuration(prediction.at - now)}`
              : `באיחור של ${formatDuration(now - prediction.at)} מהרגיל`}
            {' · '}זמן ערות ממוצע {formatDuration(prediction.windowMs)}
          </Text>
        </View>
      ) : null}

      <View style={[styles.stripCard, { backgroundColor: p.card, borderColor: p.border }]}>
        <HourAxis />
        <DayStrip day={now} events={events} now={now} onPressEvent={openEvent} />
      </View>

      <View style={styles.lastRow}>
        <LastCard type="feed" event={lastFeed} now={now} onPress={() => lastFeed && openEvent(lastFeed)} />
        <LastCard type="diaper" event={lastDiaper} now={now} onPress={() => lastDiaper && openEvent(lastDiaper)} />
        <LastCard
          type="sleep"
          event={lastSleep}
          now={now}
          onPress={() => lastSleep && openEvent(lastSleep)}
          override={
            sleeping
              ? { big: formatDuration(now - sleeping.start), small: 'ישן/ה' }
              : lastSleep?.end !== undefined
                ? { big: formatDuration(now - lastSleep.end), small: 'ער/ה' }
                : undefined
          }
        />
      </View>

      <Text style={[styles.section, { color: p.muted }]}>היום</Text>
      <SummaryChips summary={summary} />

      <View style={{ marginTop: 12 }}>
        {today.length === 0 ? (
          <Text style={[styles.empty, { color: p.muted }]}>עוד לא נרשם כלום היום. הקישו על כפתור למעלה כדי להתחיל.</Text>
        ) : (
          today.map((e) => <EventRow key={e.id} event={e} now={now} onPress={() => openEvent(e)} />)
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
  const big = override?.big ?? (event ? (justNow ? 'עכשיו' : formatDuration(now - event.start)) : '—');
  const small = override?.small ?? (event ? (justNow ? ' ' : 'מאז הפעם האחרונה') : 'אין נתונים');
  return (
    <Pressable onPress={onPress} style={[styles.lastCard, { backgroundColor: p.card, borderColor: p.border }]}>
      <View style={styles.lastHead}>
        <View style={[styles.dot, { backgroundColor: p.types[type] }]} />
        <Text style={[styles.lastTitle, { color: p.muted }]}>
          {meta.emoji} {meta.label}
        </Text>
      </View>
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
  // writingDirection keeps a Latin-script name ("Tom") right-aligned in the RTL layout
  hello: { fontSize: 26, fontWeight: '800', writingDirection: 'rtl' },
  age: { fontSize: 15, marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, rowGap: 12 },
  quick: { width: '25%', alignItems: 'center' },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleEmoji: { fontSize: 28 },
  quickLabel: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  hint: { fontSize: 12, marginTop: 10, textAlign: 'center' },
  banner: { marginTop: 14, padding: 14, borderRadius: 16, borderWidth: 2 },
  bannerTitle: { fontSize: 18, fontWeight: '700' },
  bannerSub: { fontSize: 13, marginTop: 2 },
  predict: { marginTop: 14, padding: 12, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed' },
  predictTitle: { fontSize: 16, fontWeight: '700' },
  stripCard: { marginTop: 14, padding: 10, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  lastRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  lastCard: { flex: 1, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  lastHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  lastTitle: { fontSize: 13, fontWeight: '700' },
  lastBig: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  lastSmall: { fontSize: 12 },
  lastDetail: { fontSize: 12, marginTop: 4 },
  section: { fontSize: 13, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  empty: { fontSize: 15, textAlign: 'center', paddingVertical: 20 },
});
