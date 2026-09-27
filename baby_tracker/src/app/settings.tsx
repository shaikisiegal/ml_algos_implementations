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
      Share.share({ title: 'Baby Log backup', message: text }).catch(() => {});
      return;
    }
    // Web: share sheet where available (iPhone), otherwise download a file.
    const name = `baby-log-backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], title: 'Baby Log backup' });
      if (navigator.share) return await navigator.share({ title: 'Baby Log backup', text });
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
        'Replace all data?',
        `This replaces the ${events.length} events on this device with ${backup.events.length} events from the backup.`,
        'Replace',
        () => {
          replaceAll(backup.events);
          if (backup.profile) {
            setProfile(backup.profile);
            setName(backup.profile.name);
            setBirthDate(backup.profile.birthDate);
          }
          setImportText('');
          setImportMsg({ ok: true, text: `Imported ${backup.events.length} ${backup.events.length === 1 ? 'event' : 'events'}.` });
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
      <Text style={[styles.label, { color: p.muted }]}>BABY'S NAME</Text>
      <TextInput value={name} onChangeText={setName} placeholder="e.g. Noa" placeholderTextColor={p.muted} style={inputStyle} />

      <Text style={[styles.label, { color: p.muted }]}>BIRTH DATE</Text>
      {birthDate !== undefined ? (
        <View style={{ gap: 8 }}>
          <TimeField mode="date" value={birthDate} onChange={setBirthDate} />
          <Text style={{ color: p.muted }}>{formatAge(birthDate)}</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <Chip label="Set birth date" onPress={() => setBirthDate(Date.now())} />
        </View>
      )}

      <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: p.accent }]}>
        <Text style={styles.saveText}>Save</Text>
      </Pressable>

      <Text style={[styles.label, { color: p.muted, marginTop: 36 }]}>DATA</Text>
      <Text style={{ color: p.muted, marginBottom: 10 }}>
        {events.length} {events.length === 1 ? 'event' : 'events'} saved on this device. Export a backup regularly (save it to Files, Notes, WhatsApp…) —
        it's also how you move your data to another phone.
      </Text>
      <Pressable onPress={exportData} style={[styles.secondaryBtn, { borderColor: p.border, backgroundColor: p.card }]}>
        <Text style={[styles.secondaryText, { color: p.text }]}>Export backup</Text>
      </Pressable>
      <Text style={[styles.label, { color: p.muted }]}>RESTORE A BACKUP</Text>
      <TextInput
        value={importText}
        onChangeText={(t) => {
          setImportText(t);
          setImportMsg(null);
        }}
        placeholder="Paste the backup text here"
        placeholderTextColor={p.muted}
        multiline
        accessibilityLabel="Backup text"
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
        <Text style={[styles.secondaryText, { color: p.text }]}>Import backup</Text>
      </Pressable>

      <Pressable
        onPress={() =>
          confirm('Delete all events?', `This removes all ${events.length} events from this phone.`, 'Delete all', () => {
            replaceAll([]);
            router.back();
          })
        }
        style={[styles.secondaryBtn, { borderColor: p.danger, marginTop: 10 }]}
      >
        <Text style={[styles.secondaryText, { color: p.danger }]}>Delete all events</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 17 },
  saveBtn: { marginTop: 28, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  importBox: { minHeight: 80, fontSize: 13, textAlignVertical: 'top' },
  secondaryBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  secondaryText: { fontSize: 16, fontWeight: '700' },
});
