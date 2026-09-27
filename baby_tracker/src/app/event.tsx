import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '../components/Chip';
import { QuickTimes } from '../components/QuickTimes';
import { TimeField } from '../components/TimeField';
import { confirm, successFeedback } from '../lib/feedback';
import { useStore, type NewEvent } from '../lib/store';
import { tint, usePalette } from '../lib/theme';
import { formatDuration } from '../lib/time';
import {
  DIAPER_META,
  EVENT_TYPES,
  STOOL_COLORS,
  TYPE_META,
  type BreastSide,
  type DiaperKind,
  type EventType,
  type FeedMethod,
  type MilkType,
  type StoolColor,
} from '../lib/types';

const ML_PRESETS = [30, 60, 90, 120, 150, 180];
const MIN_PRESETS = [5, 10, 15, 20, 30];

type Params = { id?: string; type?: EventType; at?: string };

function defaultsFor(type: EventType, start: number): NewEvent {
  switch (type) {
    case 'feed':
      return { type, start, method: 'bottle', milk: 'formula', amountMl: 90 };
    case 'diaper':
      return { type, start, diaper: 'wet' };
    case 'sleep':
      return { type, start };
    default:
      return { type, start };
  }
}

/** Drop fields that don't apply to the chosen type/method (left over from switching chips). */
function normalize(d: NewEvent): NewEvent {
  const out: NewEvent = { type: d.type, start: d.start };
  const note = d.note?.trim();
  if (note) out.note = note;
  switch (d.type) {
    case 'feed':
      out.method = d.method;
      if (d.method === 'bottle') Object.assign(out, { milk: d.milk, amountMl: d.amountMl });
      if (d.method === 'breast') Object.assign(out, { side: d.side, durationMin: d.durationMin });
      if (d.method === 'solids' && d.food?.trim()) out.food = d.food.trim();
      break;
    case 'diaper':
      out.diaper = d.diaper;
      if (d.diaper === 'dirty' || d.diaper === 'mixed') out.color = d.color;
      break;
    case 'sleep':
      if (d.end !== undefined) out.end = d.end;
      break;
    case 'medicine':
      out.medName = d.medName?.trim();
      if (d.dose?.trim()) out.dose = d.dose.trim();
      break;
  }
  return out;
}

export default function EventScreen() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Params>();
  const { events, addEvent, replaceEvent, deleteEvent } = useStore();

  const existing = params.id ? events.find((e) => e.id === params.id) : undefined;
  const initialType: EventType = existing?.type ?? (params.type && EVENT_TYPES.includes(params.type) ? params.type : 'feed');
  const initialStart = params.at ? Number(params.at) : Date.now();

  const [draft, setDraft] = useState<NewEvent>(() => {
    if (existing) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = existing;
      return rest;
    }
    return defaultsFor(initialType, initialStart);
  });
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<NewEvent>) => {
    setError(null);
    setDraft((d) => ({ ...d, ...patch }));
  };

  // Switching type keeps the time and note but resets type-specific fields.
  const changeType = (type: EventType) => {
    if (type === draft.type) return;
    setDraft((d) => ({ ...defaultsFor(type, d.start), note: d.note }));
  };

  const meta = TYPE_META[draft.type];
  const isEdit = !!existing;

  const save = () => {
    if (draft.type === 'sleep' && draft.end !== undefined && draft.end < draft.start) {
      setError('Wake-up time must be after the sleep started.');
      return;
    }
    if (draft.type === 'medicine' && !draft.medName?.trim()) {
      setError('Please enter the medicine name.');
      return;
    }
    const clean = normalize(draft);
    if (existing) replaceEvent(existing.id, clean);
    else addEvent(clean);
    successFeedback();
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    confirm('Delete event?', 'This cannot be undone.', 'Delete', () => {
      deleteEvent(existing.id);
      router.back();
    });
  };

  if (params.id && !existing) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: p.bg }]}>
        <Text style={{ color: p.muted }}>This event no longer exists.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: p.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: `${isEdit ? 'Edit' : 'New'} ${meta.label.toLowerCase()}` }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.typeRow}>
          {EVENT_TYPES.map((t) => {
            const m = TYPE_META[t];
            const sel = t === draft.type;
            return (
              <Pressable
                key={t}
                onPress={() => changeType(t)}
                accessibilityLabel={m.label}
                accessibilityState={{ selected: sel }}
                style={[
                  styles.typeBtn,
                  { backgroundColor: sel ? tint(m.color, 0.2) : p.chip, borderColor: sel ? m.color : 'transparent' },
                ]}
              >
                <Text style={styles.typeEmoji}>{m.emoji}</Text>
                <Text style={[styles.typeLabel, { color: sel ? m.color : p.muted }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Section title={draft.type === 'sleep' ? 'Fell asleep' : 'When'}>
          <TimeField value={draft.start} onChange={(start) => set({ start })} />
          <QuickTimes onPick={(start) => set({ start })} />
        </Section>

        {draft.type === 'sleep' ? <SleepFields draft={draft} set={set} /> : null}
        {draft.type === 'feed' ? <FeedFields draft={draft} set={set} /> : null}
        {draft.type === 'diaper' ? <DiaperFields draft={draft} set={set} /> : null}
        {draft.type === 'medicine' ? <MedicineFields draft={draft} set={set} /> : null}

        <Section title={draft.type === 'note' ? 'Note' : 'Note (optional)'}>
          <TextInput
            value={draft.note ?? ''}
            onChangeText={(note) => set({ note })}
            placeholder={draft.type === 'note' ? 'e.g. first smile! 😊' : 'Anything worth remembering…'}
            placeholderTextColor={p.muted}
            multiline
            style={[styles.input, styles.multiline, { backgroundColor: p.card, borderColor: p.border, color: p.text }]}
          />
        </Section>

        {error ? <Text style={[styles.error, { color: p.danger }]}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), borderColor: p.border, backgroundColor: p.bg }]}>
        {isEdit ? (
          <Pressable onPress={remove} style={[styles.deleteBtn, { borderColor: p.danger }]}>
            <Text style={[styles.deleteText, { color: p.danger }]}>Delete</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={save}
          style={({ pressed }) => [styles.saveBtn, { backgroundColor: meta.color }, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.saveText}>{isEdit ? 'Save changes' : `Save ${meta.label.toLowerCase()}`}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

type FieldProps = { draft: NewEvent; set: (patch: Partial<NewEvent>) => void };

function Section({ title, children }: { title: string; children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: p.muted }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

function FeedFields({ draft, set }: FieldProps) {
  const p = usePalette();
  const color = TYPE_META.feed.color;
  const methods: { key: FeedMethod; label: string }[] = [
    { key: 'bottle', label: '🍼 Bottle' },
    { key: 'breast', label: '🤱 Breast' },
    { key: 'solids', label: '🥣 Solids' },
  ];
  const amount = draft.amountMl ?? 0;

  return (
    <>
      <Section title="Type">
        <ChipRow>
          {methods.map((m) => (
            <Chip key={m.key} big label={m.label} color={color} selected={draft.method === m.key} onPress={() => set({ method: m.key })} />
          ))}
        </ChipRow>
      </Section>

      {draft.method === 'bottle' ? (
        <>
          <Section title="Milk">
            <ChipRow>
              {(
                [
                  ['formula', 'Formula'],
                  ['breastmilk', 'Breast milk'],
                ] as [MilkType, string][]
              ).map(([k, label]) => (
                <Chip key={k} label={label} color={color} selected={draft.milk === k} onPress={() => set({ milk: k })} />
              ))}
            </ChipRow>
          </Section>
          <Section title="Amount">
            <View style={styles.stepper}>
              <StepBtn label="−" onPress={() => set({ amountMl: Math.max(0, amount - 10) })} />
              <View style={styles.amountBox}>
                <Text style={[styles.amount, { color: p.text }]}>{amount}</Text>
                <Text style={[styles.amountUnit, { color: p.muted }]}>ml</Text>
              </View>
              <StepBtn label="+" onPress={() => set({ amountMl: amount + 10 })} />
            </View>
            <ChipRow>
              {ML_PRESETS.map((ml) => (
                <Chip key={ml} label={`${ml}`} color={color} selected={amount === ml} onPress={() => set({ amountMl: ml })} />
              ))}
            </ChipRow>
          </Section>
        </>
      ) : null}

      {draft.method === 'breast' ? (
        <>
          <Section title="Side">
            <ChipRow>
              {(
                [
                  ['left', 'Left'],
                  ['right', 'Right'],
                  ['both', 'Both'],
                ] as [BreastSide, string][]
              ).map(([k, label]) => (
                <Chip key={k} big label={label} color={color} selected={draft.side === k} onPress={() => set({ side: k })} />
              ))}
            </ChipRow>
          </Section>
          <Section title="Duration (minutes)">
            <ChipRow>
              {MIN_PRESETS.map((m) => (
                <Chip key={m} label={`${m}`} color={color} selected={draft.durationMin === m} onPress={() => set({ durationMin: m })} />
              ))}
            </ChipRow>
            <NumberInput value={draft.durationMin} onChange={(durationMin) => set({ durationMin })} placeholder="Other…" />
          </Section>
        </>
      ) : null}

      {draft.method === 'solids' ? (
        <Section title="What did baby eat?">
          <TextInput
            value={draft.food ?? ''}
            onChangeText={(food) => set({ food })}
            placeholder="e.g. banana puree"
            placeholderTextColor={p.muted}
            style={[styles.input, { backgroundColor: p.card, borderColor: p.border, color: p.text }]}
          />
        </Section>
      ) : null}
    </>
  );
}

function DiaperFields({ draft, set }: FieldProps) {
  const color = TYPE_META.diaper.color;
  const showColor = draft.diaper === 'dirty' || draft.diaper === 'mixed';
  return (
    <>
      <Section title="What's in it?">
        <View style={styles.grid2}>
          {(Object.keys(DIAPER_META) as DiaperKind[]).map((k) => (
            <Chip
              key={k}
              big
              style={styles.half}
              label={`${DIAPER_META[k].emoji}  ${DIAPER_META[k].label}`}
              color={color}
              selected={draft.diaper === k}
              onPress={() => set({ diaper: k, color: k === 'dirty' || k === 'mixed' ? draft.color : undefined })}
            />
          ))}
        </View>
      </Section>
      {showColor ? (
        <Section title="Poop color (optional)">
          <ChipRow>
            {(Object.keys(STOOL_COLORS) as StoolColor[]).map((c) => (
              <Chip
                key={c}
                label={`● ${STOOL_COLORS[c].label}`}
                color={STOOL_COLORS[c].swatch}
                selected={draft.color === c}
                onPress={() => set({ color: draft.color === c ? undefined : c })}
              />
            ))}
          </ChipRow>
        </Section>
      ) : null}
    </>
  );
}

function SleepFields({ draft, set }: FieldProps) {
  const p = usePalette();
  const color = TYPE_META.sleep.color;
  const ongoing = draft.end === undefined;
  return (
    <Section title="Woke up">
      <ChipRow>
        <Chip label="Still sleeping" color={color} selected={ongoing} onPress={() => set({ end: undefined })} />
        <Chip label="Woke up at…" color={color} selected={!ongoing} onPress={() => set({ end: Math.max(Date.now(), draft.start) })} />
      </ChipRow>
      {!ongoing ? (
        <View style={{ marginTop: 10 }}>
          <TimeField value={draft.end!} onChange={(end) => set({ end })} />
          <QuickTimes onPick={(end) => set({ end })} />
          <Text style={[styles.duration, { color: p.text }]}>
            Duration: <Text style={{ color, fontWeight: '800' }}>{formatDuration(draft.end! - draft.start)}</Text>
          </Text>
        </View>
      ) : null}
    </Section>
  );
}

function MedicineFields({ draft, set }: FieldProps) {
  const p = usePalette();
  const inputStyle = [styles.input, { backgroundColor: p.card, borderColor: p.border, color: p.text }];
  return (
    <Section title="Medicine">
      <TextInput
        value={draft.medName ?? ''}
        onChangeText={(medName) => set({ medName })}
        placeholder="Name (e.g. Vitamin D)"
        placeholderTextColor={p.muted}
        style={inputStyle}
      />
      <TextInput
        value={draft.dose ?? ''}
        onChangeText={(dose) => set({ dose })}
        placeholder="Dose (e.g. 1 drop, 2.5 ml)"
        placeholderTextColor={p.muted}
        style={[inputStyle, { marginTop: 8 }]}
      />
    </Section>
  );
}

function StepBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const color = TYPE_META.feed.color;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label === '+' ? 'Increase' : 'Decrease'}
      style={({ pressed }) => [styles.stepBtn, { backgroundColor: tint(color, 0.18) }, pressed && { opacity: 0.6 }]}
    >
      <Text style={[styles.stepText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function NumberInput({ value, onChange, placeholder }: { value?: number; onChange: (n?: number) => void; placeholder: string }) {
  const p = usePalette();
  return (
    <TextInput
      value={value !== undefined ? String(value) : ''}
      onChangeText={(t) => {
        const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
        onChange(Number.isNaN(n) ? undefined : n);
      }}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor={p.muted}
      style={[styles.input, { marginTop: 8, backgroundColor: p.card, borderColor: p.border, color: p.text }]}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 24 },
  typeRow: { flexDirection: 'row', gap: 6 },
  typeBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, borderWidth: 2 },
  typeEmoji: { fontSize: 22 },
  typeLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  half: { flexBasis: '47%' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 12 },
  stepBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 30, fontWeight: '700', lineHeight: 34 },
  amountBox: { flexDirection: 'row', alignItems: 'baseline', minWidth: 110, justifyContent: 'center' },
  amount: { fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  amountUnit: { fontSize: 18, marginLeft: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  duration: { fontSize: 16, marginTop: 10 },
  error: { marginTop: 16, fontSize: 15, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  deleteBtn: { paddingHorizontal: 18, borderRadius: 14, borderWidth: 2, justifyContent: 'center' },
  deleteText: { fontSize: 16, fontWeight: '700' },
  saveBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
