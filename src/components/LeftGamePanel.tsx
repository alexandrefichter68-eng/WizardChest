import { useRef, useState } from 'react';
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

export interface GameLogEntry {
  id: string;
  text: string;
}

interface LeftGamePanelProps {
  messages: ChatEntry[];
  onSend: (text: string) => void;
  musicEnabled: boolean;
  musicVolume: number;
  onToggleMusic: (enabled: boolean) => void;
  onChangeVolume: (volume: number) => void;
  /** Session-only transport controls, independent of the persisted `musicEnabled` setting. */
  isMusicPlaying: boolean;
  onToggleMusicPlayback: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  /** Readable feed of moves and spell casts, oldest first. */
  logEntries: GameLogEntry[];
  width?: number;
}

/** Always-open left sidebar: local text chat log, music controls, then a readable match log. */
export function LeftGamePanel({
  messages,
  onSend,
  musicEnabled,
  musicVolume,
  onToggleMusic,
  onChangeVolume,
  isMusicPlaying,
  onToggleMusicPlayback,
  onNextTrack,
  onPrevTrack,
  logEntries,
  width = 116,
}: LeftGamePanelProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const logScrollRef = useRef<ScrollView>(null);

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

      <Text style={styles.sectionTitle}>{t('game.logTitle')}</Text>
      <ScrollView
        ref={logScrollRef}
        style={styles.logList}
        contentContainerStyle={styles.logContent}
        onContentSizeChange={() => logScrollRef.current?.scrollToEnd({ animated: true })}
      >
        {logEntries.length === 0 ? (
          <Text style={styles.logEmptyText}>{t('game.logEmpty')}</Text>
        ) : (
          logEntries.map((entry) => (
            <Text key={entry.id} style={styles.logEntry}>
              {entry.text}
            </Text>
          ))
        )}
      </ScrollView>

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
      <View style={styles.transportRow}>
        <Pressable
          onPress={onPrevTrack}
          disabled={!musicEnabled}
          accessibilityRole="button"
          accessibilityLabel={t('settings.musicPrev')}
          style={({ pressed }) => [styles.transportButton, !musicEnabled && styles.transportButtonDisabled, pressed && musicEnabled && styles.transportButtonPressed]}
        >
          <Text style={styles.transportIcon}>⏮</Text>
        </Pressable>
        <Pressable
          onPress={onToggleMusicPlayback}
          disabled={!musicEnabled}
          accessibilityRole="button"
          accessibilityLabel={isMusicPlaying ? t('settings.musicPause') : t('settings.musicPlay')}
          style={({ pressed }) => [styles.transportButton, !musicEnabled && styles.transportButtonDisabled, pressed && musicEnabled && styles.transportButtonPressed]}
        >
          <Text style={styles.transportIcon}>{isMusicPlaying ? '⏸' : '▶'}</Text>
        </Pressable>
        <Pressable
          onPress={onNextTrack}
          disabled={!musicEnabled}
          accessibilityRole="button"
          accessibilityLabel={t('settings.musicNext')}
          style={({ pressed }) => [styles.transportButton, !musicEnabled && styles.transportButtonDisabled, pressed && musicEnabled && styles.transportButtonPressed]}
        >
          <Text style={styles.transportIcon}>⏭</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: palette.stonePanel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    padding: spacing.sm,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  sectionTitle: {
    color: palette.violetBright,
    fontFamily: fontFamily.display,
    fontSize: fontSize.md,
  },
  divider: {
    height: 1,
    backgroundColor: palette.stoneBorder,
    marginVertical: spacing.xxs,
  },
  chatList: {
    maxHeight: 200,
  },
  chatContent: {
    gap: 6,
  },
  systemMessage: {
    color: palette.ivoryFaint,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  playerMessage: {
    color: palette.ivory,
    fontSize: fontSize.sm,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    color: palette.ivory,
    fontSize: fontSize.sm,
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: palette.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: palette.ivory,
    fontSize: fontSize.lg,
  },
  musicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transportRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  transportButton: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.stonePanelRaised,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  transportButtonPressed: {
    opacity: 0.7,
  },
  transportButtonDisabled: {
    opacity: 0.35,
  },
  transportIcon: {
    color: palette.ivory,
    fontSize: fontSize.md,
  },
  logList: {
    maxHeight: 180,
  },
  logContent: {
    gap: 4,
  },
  logEmptyText: {
    color: palette.ivoryFaint,
    fontSize: fontSize.sm,
    lineHeight: fontSize.md,
  },
  logEntry: {
    color: palette.ivoryMuted,
    fontSize: fontSize.xs,
    lineHeight: fontSize.sm + 4,
  },
});
