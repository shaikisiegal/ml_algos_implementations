import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '../components/Chip';
import { TimeField } from '../components/TimeField';
import { parseBackup, serializeBackup } from '../lib/backup';
import { confirm, successFeedback } from '../lib/feedback';
import { useStore } from '../lib/store';
import { usePalette } from '../lib/theme';
import { formatAge } from '../lib/time';

export default function SettingsScreen() {
  const p = usePalette();
  const { profile, setProfile, events, replaceAll } = useStore();
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState(profile.name);
  const [birthDate, setBirthDate] = useState<number | undefined>(profile.birthDate);

  const save = () => {
    setProfile({ name: name.trim(), birthDate });
    successFeedback();
    router.back();
  };

  const exportData = async () => {
    const text = serializeBackup({ profile, events });
    if (Platform.OS !== 'web') {
      Share.share({ title: 'גיבוי Baby Log', message: text }).catch(() => {});
      return;
    }
    // Web: share sheet where available (iPhone), otherwise download a file.
    const name = `baby-log-backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], title: 'גיבוי Baby Log' });
      if (navigator.share) return await navigator.share({ title: 'גיבוי Baby Log', text });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // user closed the share sheet
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = () => {
    try {
      const backup = parseBackup(importText);
      confirm(
        'להחליף את כל הנתונים?',
        `${events.length} האירועים במכשיר יוחלפו ב-${backup.events.length} אירועים מהגיבוי.`,
        'החלפה',
        () => {
          replaceAll(backup.events);
          if (backup.profile) {
            setProfile(backup.profile);
            setName(backup.profile.name);
            setBirthDate(backup.profile.birthDate);
          }
          setImportText('');
          setImportMsg({ ok: true, text: `יובאו ${backup.events.length} אירועים.` });
          successFeedback();
        },
      );
    } catch (err) {
      setImportMsg({ ok: false, text: (err as Error).message });
    }
  };

  const inputStyle = [styles.input, { backgroundColor: p.card, borderColor: p.border, color: p.text }];

  return (
    <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={styles.content}>
      <Text style={[styles.label, { color: p.muted }]}>שם התינוק/ת</Text>
      <TextInput value={name} onChangeText={setName} placeholder="למשל: נועה" placeholderTextColor={p.muted} style={inputStyle} />

      <Text style={[styles.label, { color: p.muted }]}>תאריך לידה</Text>
      {birthDate !== undefined ? (
        <View style={{ gap: 8 }}>
          <TimeField mode="date" value={birthDate} onChange={setBirthDate} />
          <Text style={{ color: p.muted }}>{formatAge(birthDate)}</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <Chip label="הוספת תאריך לידה" onPress={() => setBirthDate(Date.now())} />
        </View>
      )}

      <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: p.accent }]}>
        <Text style={styles.saveText}>שמירה</Text>
      </Pressable>

      <Text style={[styles.label, { color: p.muted, marginTop: 36 }]}>נתונים</Text>
      <Text style={{ color: p.muted, marginBottom: 10 }}>
        {events.length} אירועים שמורים במכשיר הזה. כדאי לייצא גיבוי מדי פעם (לשמור בקבצים, בפתקים, בוואטסאפ…) —
        כך גם מעבירים את הנתונים לטלפון אחר.
      </Text>
      <Pressable onPress={exportData} style={[styles.secondaryBtn, { borderColor: p.border, backgroundColor: p.card }]}>
        <Text style={[styles.secondaryText, { color: p.text }]}>ייצוא גיבוי</Text>
      </Pressable>
      <Text style={[styles.label, { color: p.muted }]}>שחזור מגיבוי</Text>
      <TextInput
        value={importText}
        onChangeText={(t) => {
          setImportText(t);
          setImportMsg(null);
        }}
        placeholder="הדביקו כאן את טקסט הגיבוי"
        placeholderTextColor={p.muted}
        multiline
        accessibilityLabel="טקסט הגיבוי"
        style={[inputStyle, styles.importBox]}
      />
      {importMsg ? (
        <Text style={{ color: importMsg.ok ? p.text : p.danger, marginTop: 6, fontWeight: '600' }}>{importMsg.text}</Text>
      ) : null}
      <Pressable
        onPress={importData}
        disabled={!importText.trim()}
        style={[styles.secondaryBtn, { borderColor: p.border, backgroundColor: p.card, marginTop: 10, opacity: importText.trim() ? 1 : 0.5 }]}
      >
        <Text style={[styles.secondaryText, { color: p.text }]}>ייבוא גיבוי</Text>
      </Pressable>

      <Pressable
        onPress={() =>
          confirm('למחוק את כל האירועים?', `כל ${events.length} האירועים יימחקו מהמכשיר הזה.`, 'מחיקת הכל', () => {
            replaceAll([]);
            router.back();
          })
        }
        style={[styles.secondaryBtn, { borderColor: p.danger, marginTop: 10 }]}
      >
        <Text style={[styles.secondaryText, { color: p.danger }]}>מחיקת כל האירועים</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  input: { writingDirection: 'rtl', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 17 },
  saveBtn: { marginTop: 28, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  importBox: { minHeight: 80, fontSize: 13, textAlignVertical: 'top' },
  secondaryBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  secondaryText: { fontSize: 16, fontWeight: '700' },
});
