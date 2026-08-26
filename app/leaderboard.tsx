import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { DivisionBadge } from '@/components/DivisionBadge';
import { FlagBadge } from '@/components/FlagBadge';
import { ScreenBackground } from '@/components/ScreenBackground';
import { buildRankedEntries, findPlayerRank, type LeaderboardScope } from '@/domain/leaderboard';
import { useLeaderboardStore } from '@/store/leaderboardStore';
import { useProfileStore } from '@/store/profileStore';
import { palette } from '@/theme/colors';
import { minTouchTarget, radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';
import type { LeaderboardEntry } from '@/types';

const SCOPES: LeaderboardScope[] = ['global', 'division', 'season'];
const SCOPE_LABEL_KEYS: Record<LeaderboardScope, string> = {
  global: 'leaderboard.scopeGlobal',
  division: 'leaderboard.scopeDivision',
  season: 'leaderboard.scopeSeason',
};

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const profile = useProfileStore((s) => s.profile);
  const bots = useLeaderboardStore((s) => s.bots);
  const [scope, setScope] = useState<LeaderboardScope>('global');

  const entries = useMemo(() => buildRankedEntries(bots, profile, scope), [bots, profile, scope]);
  const playerRank = useMemo(() => findPlayerRank(entries, profile.id), [entries, profile.id]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <Header title={t('leaderboard.title')} onBack={() => router.back()} />

        <View style={styles.scopeRow}>
          {SCOPES.map((s) => (
            <Pressable
              key={s}
              onPress={() => setScope(s)}
              accessibilityRole="button"
              accessibilityState={{ selected: scope === s }}
              style={[styles.scopeChip, scope === s && styles.scopeChipActive]}
            >
              <Text style={[styles.scopeChipText, scope === s && styles.scopeChipTextActive]}>{t(SCOPE_LABEL_KEYS[s])}</Text>
            </Pressable>
          ))}
        </View>

        {playerRank > 0 && <Text style={styles.rankText}>{t('leaderboard.yourRank', { rank: playerRank })}</Text>}

        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <LeaderboardRow entry={item} rank={index + 1} scope={scope} />}
          contentContainerStyle={styles.listContent}
        />

        <Text style={styles.disclaimer}>{t('leaderboard.disclaimer')}</Text>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Retour" style={styles.backButton}>
        <Text style={styles.backIcon}>‹</Text>
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: minTouchTarget }} />
    </View>
  );
}

function LeaderboardRow({ entry, rank, scope }: { entry: LeaderboardEntry; rank: number; scope: LeaderboardScope }) {
  return (
    <View style={[styles.row, entry.isPlayer && styles.rowPlayer]}>
      <Text style={styles.rank}>{rank}</Text>
      <Avatar avatar={entry.avatar} size={36} />
      <View style={styles.rowInfo}>
        <View style={styles.rowNameLine}>
          <Text style={styles.rowName} numberOfLines={1}>{entry.username}</Text>
          <FlagBadge countryCode={entry.countryCode} size={14} />
        </View>
      </View>
      <DivisionBadge divisionId={entry.division} size={26} />
      <Text style={styles.rowElo}>{scope === 'season' && entry.elo >= 0 ? '+' : ''}{entry.elo}</Text>
    </View>
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
  scopeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  scopeChip: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: palette.stonePanel,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  scopeChipActive: {
    backgroundColor: palette.violet,
    borderColor: palette.violetBright,
  },
  scopeChipText: {
    color: palette.ivoryMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  scopeChipTextActive: {
    color: palette.ivory,
  },
  rankText: {
    color: palette.goldBright,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  listContent: {
    gap: spacing.xxs,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.stonePanel,
    borderRadius: radius.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  rowPlayer: {
    borderColor: palette.gold,
    backgroundColor: palette.stonePanelRaised,
  },
  rank: {
    width: 28,
    textAlign: 'center',
    color: palette.ivoryFaint,
    fontWeight: '700',
  },
  rowInfo: {
    flex: 1,
  },
  rowNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  rowName: {
    color: palette.ivory,
    fontWeight: '600',
    flexShrink: 1,
  },
  rowElo: {
    color: palette.goldBright,
    fontWeight: '700',
    minWidth: 52,
    textAlign: 'right',
  },
  disclaimer: {
    color: palette.ivoryFaint,
    fontSize: fontSize.xs,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
