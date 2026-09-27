import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatFamilyCode, normalizeFamilyCode } from '../lib/familyCode.ts';
import { confirm, successFeedback } from '../lib/feedback.ts';
import { useStore } from '../lib/store';
import type { SyncStatus } from '../lib/sync.ts';
import { tint, usePalette } from '../lib/theme.ts';

export const SYNC_STATUS_LABEL: Record<SyncStatus, string> = {
  off: 'לא מסונכרן',
  connecting: '⏳ מתחבר…',
  synced: '✅ מסונכרן',
  saving: '⏳ שומר…',
  offline: '📴 אין חיבור — השינויים יישלחו כשיחזור האינטרנט',
  error: '⚠️ שגיאת סנכרון — בדקו את החיבור',
};

async function shareText(message: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (Platform.OS !== 'web') {
      await Share.share({ message });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ text: message });
      return 'shared';
    }
    await navigator.clipboard.writeText(message);
    return 'copied';
  } catch (err) {
    return (err as Error).name === 'AbortError' ? 'shared' : 'failed';
  }
}

/** Settings block: create / join / leave a family so two phones share the same log. */
export function SyncSection() {
  const p = usePalette();
  const { syncAvailable, family, syncStatus, createFamily, joinFamily, leaveFamily, events } = useStore();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const inputStyle = [styles.input, { backgroundColor: p.card, borderColor: p.border, color: p.text }];
  const button = (label: string, onPress: () => void, primary = false, disabled = false) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        primary ? { backgroundColor: p.accent, borderColor: p.accent } : { backgroundColor: p.card, borderColor: p.border },
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.8 },
      ]}
    >
      <Text style={[styles.btnText, { color: primary ? '#fff' : p.text }]}>{label}</Text>
    </Pressable>
  );

  if (!syncAvailable) {
    return (
      <Text style={[styles.body, { color: p.muted }]}>
        הסנכרון בין טלפונים עוד לא הוגדר באפליקציה (צריך לחבר פרויקט Firebase).
      </Text>
    );
  }

  if (family) {
    const pretty = formatFamilyCode(family);
    return (
      <View>
        <Text style={[styles.body, { color: p.text }]}>{SYNC_STATUS_LABEL[syncStatus]}</Text>
        <View style={[styles.codeBox, { backgroundColor: tint(p.accent, 0.1), borderColor: p.accent }]}>
          <Text style={[styles.codeLabel, { color: p.muted }]}>קוד המשפחה</Text>
          <Text selectable style={[styles.code, { color: p.text }]}>
            {pretty}
          </Text>
        </View>
        <Text style={[styles.body, { color: p.muted }]}>
          בטלפון השני: פותחים את האפליקציה ← ⚙️ ← "הצטרפות עם קוד" ומזינים את הקוד. שמרו על הקוד בינכם — מי שיש לו
          אותו רואה את הנתונים.
        </Text>
        {button('שיתוף הקוד', async () => {
          const r = await shareText(`קוד המשפחה ל-Baby Log: ${pretty}`);
          setMsg(r === 'copied' ? 'הקוד הועתק' : r === 'failed' ? 'לא הצלחתי לשתף — העתיקו את הקוד ידנית' : null);
        })}
        {msg ? <Text style={[styles.msg, { color: p.text }]}>{msg}</Text> : null}
        <View style={{ height: 10 }} />
        {button('הפסקת הסנכרון בטלפון הזה', () =>
          confirm(
            'להפסיק את הסנכרון?',
            'הנתונים שכבר בטלפון יישארו בו, אבל שינויים חדשים לא יעברו בין הטלפונים.',
            'הפסקה',
            leaveFamily,
          ),
        )}
      </View>
    );
  }

  const normalized = normalizeFamilyCode(code);
  return (
    <View>
      <Text style={[styles.body, { color: p.muted }]}>
        כדי ששני ההורים יראו ויעדכנו את אותם נתונים: בטלפון אחד יוצרים קוד משפחה, ובטלפון השני מצטרפים איתו.
      </Text>
      {button('יצירת קוד משפחה (בטלפון הראשון)', () => {
        createFamily();
        successFeedback();
      }, true)}

      <Text style={[styles.sub, { color: p.muted }]}>הצטרפות עם קוד (בטלפון השני)</Text>
      <TextInput
        value={code}
        onChangeText={(t) => {
          setCode(t);
          setMsg(null);
        }}
        placeholder="ABCD-EFGH-JKLM-NPQR"
        placeholderTextColor={p.muted}
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel="קוד משפחה"
        style={inputStyle}
      />
      {code.trim() && !normalized ? (
        <Text style={[styles.msg, { color: p.danger }]}>הקוד צריך להכיל 16 תווים (אותיות באנגלית ומספרים).</Text>
      ) : null}
      <View style={{ height: 8 }} />
      {button(
        'הצטרפות',
        () =>
          normalized &&
          confirm(
            'להצטרף למשפחה?',
            events.length
              ? `${events.length} האירועים שבטלפון הזה יתווספו לנתוני המשפחה.`
              : 'הנתונים של המשפחה יופיעו בטלפון הזה.',
            'הצטרפות',
            () => {
              joinFamily(normalized);
              setCode('');
              successFeedback();
            },
          ),
        false,
        !normalized,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  sub: { fontSize: 13, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  input: {
    writingDirection: 'ltr',
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 1,
  },
  codeBox: { borderWidth: 1.5, borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10 },
  codeLabel: { fontSize: 12, fontWeight: '700' },
  code: { fontSize: 24, fontWeight: '800', letterSpacing: 1, marginTop: 4, writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
  btn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  btnText: { fontSize: 16, fontWeight: '700' },
  msg: { fontSize: 13, fontWeight: '600', marginTop: 6 },
});
