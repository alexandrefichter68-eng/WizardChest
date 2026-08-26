import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { VolumeControl } from '@/components/VolumeControl';
import { palette } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

export interface ChatEntry {
  id: string;
  from: 'system' | 'player';
  text: string;
}

interface LeftGamePanelProps {
  messages: ChatEntry[];
  onSend: (text: string) => void;
  musicEnabled: boolean;
  musicVolume: number;
  onToggleMusic: (enabled: boolean) => void;
  onChangeVolume: (volume: number) => void;
  width?: number;
}

/** Always-open left sidebar: local text chat log, plus music controls reachable mid-match. */
export function LeftGamePanel({ messages, onSend, musicEnabled, musicVolume, onToggleMusic, onChangeVolume, width = 116 }: LeftGamePanelProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft('');
  };

  return (
    <View style={[styles.panel, { width }]}>
      <Text style={styles.sectionTitle}>{t('game.chatTitle')}</Text>
      <ScrollView style={styles.chatList} contentContainerStyle={styles.chatContent}>
        {messages.map((entry) => (
          <Text key={entry.id} style={entry.from === 'system' ? styles.systemMessage : styles.playerMessage} numberOfLines={3}>
            {entry.text}
          </Text>
        ))}
      </ScrollView>
      <View style={styles.chatInputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('game.chatPlaceholder')}
          placeholderTextColor={palette.ivoryFaint}
          style={styles.chatInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable onPress={handleSend} accessibilityRole="button" accessibilityLabel={t('game.chatSend')} style={styles.sendButton}>
          <Text style={styles.sendIcon}>➤</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.musicHeader}>
        <Text style={styles.sectionTitle}>{t('settings.music')}</Text>
        <Switch
          value={musicEnabled}
          onValueChange={onToggleMusic}
          trackColor={{ false: palette.stoneBorder, true: palette.violet }}
          thumbColor={palette.ivory}
        />
      </View>
      {musicEnabled && <VolumeControl label={t('settings.musicVolume')} value={musicVolume} onChange={onChangeVolume} />}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: palette.stonePanel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    padding: spacing.xs,
    gap: spacing.xxs,
  },
  sectionTitle: {
    color: palette.violetBright,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xs,
  },
  divider: {
    height: 1,
    backgroundColor: palette.stoneBorder,
    marginVertical: spacing.xxs,
  },
  chatList: {
    maxHeight: 140,
  },
  chatContent: {
    gap: 3,
  },
  systemMessage: {
    color: palette.ivoryFaint,
    fontSize: 9,
    fontStyle: 'italic',
  },
  playerMessage: {
    color: palette.ivory,
    fontSize: 10,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    color: palette.ivory,
    fontSize: 10,
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  sendButton: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: palette.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: palette.ivory,
    fontSize: 11,
  },
  musicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
