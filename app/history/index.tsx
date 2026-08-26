import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useHistoryStore } from '@/store/historyStore';
import { palette } from '@/theme/colors';
import { minTouchTarget, radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';
import type { GameHistoryEntry } from '@/types';

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return '< 1 min';
  return `${totalMinutes} min`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const RESULT_COLORS = {
  win: palette.success,
  loss: palette.danger,
  draw: palette.warning,
};

export default function HistoryScreen() {
  const { t } = useTranslation();
  const entries = useHistoryStore((s) => s.entries);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t('history.title')}</Text>
          <View style={{ width: minTouchTarget }} />
        </View>

        {entries.length === 0 ? (
          <Text style={styles.emptyText}>{t('history.empty')}</Text>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <HistoryRow entry={item} />}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

function HistoryRow({ entry }: { entry: GameHistoryEntry }) {
  const { t } = useTranslation();
  const eloDelta = entry.eloAfter - entry.eloBefore;

  return (
    <Pressable
      onPress={() => router.push(`/history/${entry.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Avatar avatar={entry.opponent.avatar} size={44} />
      <View style={styles.rowInfo}>
        <Text style={styles.opponentName} numberOfLines={1}>{entry.opponent.username}</Text>
        <Text style={styles.metaText}>
          {t('history.playedAs', { color: entry.playerColor === 'w' ? t('history.white') : t('history.black') })} · {formatDate(entry.playedAt)}
        </Text>
        <Text style={styles.metaText}>{t('history.duration', { duration: formatDuration(entry.durationMs) })}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.resultBadge, { color: RESULT_COLORS[entry.result] }]}>{t(`result.${entry.result}`)}</Text>
        <Text style={[styles.eloDelta, { color: eloDelta >= 0 ? palette.success : palette.danger }]}>
          {eloDelta >= 0 ? '+' : ''}{eloDelta}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: palette.ivory,
  },
  headerTitle: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    color: palette.ivory,
  },
  emptyText: {
    color: palette.ivoryFaint,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.stonePanel,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  rowPressed: {
    backgroundColor: palette.stonePanelRaised,
  },
  rowInfo: {
    flex: 1,
    gap: 1,
  },
  opponentName: {
    color: palette.ivory,
    fontWeight: '700',
  },
  metaText: {
    color: palette.ivoryFaint,
    fontSize: fontSize.xs,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  resultBadge: {
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  eloDelta: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
