import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DivisionBadge } from '@/components/DivisionBadge';
import { FlagBadge } from '@/components/FlagBadge';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenBackground } from '@/components/ScreenBackground';
import { getDivisionById, getDivisionProgress } from '@/domain/divisions';
import { getTimeControl } from '@/domain/timeControls';
import { TRAINING_BOT } from '@/domain/trainingBot';
import { computeDailyRewardXp } from '@/domain/xp';
import { useMatchStore } from '@/store/matchStore';
import { useProfileStore } from '@/store/profileStore';
import { useSettingsStore } from '@/store/settingsStore';
import { palette } from '@/theme/colors';
import { minTouchTarget, radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

function isSameCalendarDay(a: number, b: number): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const profile = useProfileStore((s) => s.profile);
  const setUsername = useProfileStore((s) => s.setUsername);
  const claimDailyReward = useProfileStore((s) => s.claimDailyReward);
  const startMatch = useMatchStore((s) => s.startMatch);
  const defaultTimeControl = useSettingsStore((s) => s.settings.defaultTimeControl);

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(profile.username);
  const [now] = useState(() => Date.now());

  const division = getDivisionById(profile.division);
  const progress = getDivisionProgress(profile.elo);
  const claimedToday = profile.lastDailyRewardAt !== null && isSameCalendarDay(profile.lastDailyRewardAt, now);
  const nextRewardXp = computeDailyRewardXp((profile.dailyRewardStreak ?? 0) + 1);

  const commitName = () => {
    setUsername(draftName);
    setEditingName(false);
  };

  const handleTraining = () => {
    startMatch(TRAINING_BOT, getTimeControl(defaultTimeControl), Math.random() < 0.5 ? 'w' : 'b', { isUntimed: true });
    router.push('/game');
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Avatar avatar={profile.avatar} photoUri={profile.photoUri} size={64} />
          <View style={styles.headerInfo}>
            {editingName ? (
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                onSubmitEditing={commitName}
                onBlur={commitName}
                autoFocus
                maxLength={24}
                style={styles.usernameInput}
                accessibilityLabel="Pseudonyme"
              />
            ) : (
              <Pressable onPress={() => { setDraftName(profile.username); setEditingName(true); }} accessibilityRole="button" accessibilityLabel="Modifier le pseudonyme">
                <View style={styles.usernameRow}>
                  <Text style={styles.username}>{profile.username}</Text>
                  <Text style={styles.editIcon}>✎</Text>
                </View>
              </Pressable>
            )}
            <View style={styles.metaRow}>
              <FlagBadge countryCode={profile.countryCode} size={16} />
              <Text style={styles.metaText}>{t('common.level', { level: profile.level })}</Text>
            </View>
          </View>
          <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel={t('home.settings')} style={styles.settingsButton}>
            <Text style={styles.settingsIcon}>⚙</Text>
          </Pressable>
        </View>

        <Card style={styles.eloCard}>
          <View style={styles.eloRow}>
            <DivisionBadge divisionId={profile.division} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.divisionName}>{t(`division.${division.id}`)}</Text>
              <Text style={styles.eloValue}>{profile.elo} {t('common.elo')}</Text>
            </View>
            {profile.winStreak > 0 && (
              <View style={styles.streakPill}>
                <Text style={styles.streakText}>🔥 {profile.winStreak}</Text>
              </View>
            )}
          </View>
          <ProgressBar progress={progress} color={division.color} style={{ marginTop: spacing.sm }} />
          <Text style={styles.recordText}>{t('home.record', { wins: profile.wins, losses: profile.losses, draws: profile.draws })}</Text>
        </Card>

        <Card style={styles.dailyCard}>
          <View style={styles.dailyRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dailyTitle}>{t('home.dailyRewardTitle')}</Text>
              <Text style={styles.dailyXp}>{t('home.dailyRewardXp', { xp: nextRewardXp })}</Text>
            </View>
            <Button
              label={claimedToday ? t('home.dailyRewardClaimed') : t('home.dailyRewardClaim')}
              onPress={() => claimDailyReward()}
              variant="secondary"
              disabled={claimedToday}
            />
          </View>
        </Card>

        <View style={styles.playWrap}>
          <Button label={t('home.playButton')} onPress={() => router.push('/matchmaking')} style={styles.playButton} />
        </View>

        <View style={styles.navGrid}>
          <NavTile emoji="⚔️" label={t('home.adventure')} onPress={() => router.push('/adventure')} />
          <NavTile emoji="📖" label={t('home.spellbook')} onPress={() => router.push('/spellbook')} />
          <NavTile emoji="🥋" label={t('home.training')} onPress={handleTraining} />
          <NavTile emoji="👥" label={t('home.friends')} onPress={() => router.push('/friends')} />
          <NavTile emoji="🌐" label={t('home.onlineMatch')} onPress={() => router.push('/online-matchmaking')} />
          <NavTile emoji="🏆" label={t('home.leaderboard')} onPress={() => router.push('/leaderboard')} />
          <NavTile emoji="📜" label={t('home.history')} onPress={() => router.push('/history')} />
          <NavTile emoji="🎁" label={t('home.rewards')} onPress={() => router.push('/rewards')} />
          <NavTile emoji="⚙" label={t('home.settings')} onPress={() => router.push('/settings')} />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function NavTile({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.navTile, pressed && styles.navTilePressed]}>
      <Text style={styles.navEmoji}>{emoji}</Text>
      <Text style={styles.navLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  username: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    color: palette.ivory,
  },
  usernameInput: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    color: palette.ivory,
    borderBottomWidth: 1,
    borderBottomColor: palette.gold,
    paddingVertical: 2,
    minWidth: 160,
  },
  editIcon: {
    color: palette.ivoryFaint,
    fontSize: fontSize.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: 2,
  },
  metaText: {
    color: palette.ivoryMuted,
    fontSize: fontSize.sm,
  },
  settingsButton: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.stonePanelRaised,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  settingsIcon: {
    fontSize: 20,
    color: palette.ivoryMuted,
  },
  eloCard: {},
  eloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  divisionName: {
    color: palette.ivory,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  eloValue: {
    color: palette.goldBright,
    fontSize: fontSize.sm,
  },
  streakPill: {
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  streakText: {
    color: palette.warning,
    fontWeight: '700',
  },
  recordText: {
    color: palette.ivoryFaint,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  dailyCard: {},
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dailyTitle: {
    color: palette.ivory,
    fontWeight: '700',
  },
  dailyXp: {
    color: palette.arcaneBlueBright,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  playWrap: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  playButton: {
    width: '80%',
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  navTile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: palette.stonePanel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: minTouchTarget + spacing.md,
  },
  navTilePressed: {
    backgroundColor: palette.stonePanelRaised,
  },
  navEmoji: {
    fontSize: 26,
  },
  navLabel: {
    color: palette.ivoryMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
