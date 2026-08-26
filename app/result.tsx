import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DivisionBadge } from '@/components/DivisionBadge';
import { ScreenBackground } from '@/components/ScreenBackground';
import { opponentRotation } from '@/domain/opponentGenerator';
import { getDivisionById } from '@/domain/divisions';
import { getTimeControl } from '@/domain/timeControls';
import { useHaptics } from '@/hooks/useHaptics';
import { useSfx } from '@/hooks/useSfx';
import { useMatchStore } from '@/store/matchStore';
import { useProfileStore } from '@/store/profileStore';
import { useSettingsStore } from '@/store/settingsStore';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';
import type { GameEndReason } from '@/types';

const END_REASON_KEYS: Record<GameEndReason, string> = {
  checkmate: 'result.byCheckmate',
  resignation: 'result.byResignation',
  timeout: 'result.byTimeout',
  draw_agreement: 'result.byDrawAgreement',
  stalemate: 'result.byStalemate',
  threefold_repetition: 'result.byThreefold',
  fifty_move_rule: 'result.byFiftyMove',
  insufficient_material: 'result.byInsufficientMaterial',
};

export default function ResultScreen() {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const playSfx = useSfx();
  const lastResult = useMatchStore((s) => s.lastResult);
  const clearMatch = useMatchStore((s) => s.clearMatch);
  const startMatch = useMatchStore((s) => s.startMatch);
  const profile = useProfileStore((s) => s.profile);
  const defaultTimeControl = useSettingsStore((s) => s.settings.defaultTimeControl);

  useEffect(() => {
    if (!lastResult) return;
    if (lastResult.result === 'win') haptics.success();
    else if (lastResult.result === 'loss') haptics.error();
    else haptics.warning();
    if (lastResult.result === 'draw') playSfx('draw');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!lastResult) {
    router.replace('/home');
    return null;
  }

  const resultLabel = t(`result.${lastResult.result}`);
  const resultColor =
    lastResult.result === 'win' ? palette.success : lastResult.result === 'loss' ? palette.danger : palette.warning;

  const division = getDivisionById(profile.division);

  const handleRematch = () => {
    const { opponent } = opponentRotation.next(profile.elo);
    const nextPlayerColor = lastResult.playerColor === 'w' ? 'b' : 'w';
    startMatch(opponent, getTimeControl(defaultTimeControl), nextPlayerColor);
    router.replace('/game');
  };

  const handleBackHome = () => {
    clearMatch();
    router.replace('/home');
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarsRow}>
          <Avatar avatar={profile.avatar} size={64} />
          <Text style={styles.vsText}>VS</Text>
          <Avatar avatar={lastResult.opponent.avatar} size={64} />
        </View>

        <Text style={[styles.resultTitle, { color: resultColor }]}>{resultLabel}</Text>
        <Text style={styles.endReasonText}>{t(END_REASON_KEYS[lastResult.endReason])}</Text>

        <Card style={styles.statsCard}>
          <StatLine label={t('result.eloChange')} value={`${lastResult.eloAfter - lastResult.eloBefore >= 0 ? '+' : ''}${lastResult.eloAfter - lastResult.eloBefore} (${lastResult.eloBefore} → ${lastResult.eloAfter})`} highlight={resultColor} />
          <StatLine label={t('result.xpGained')} value={`+${lastResult.xp.total} XP`} highlight={palette.arcaneBlueBright} />
        </Card>

        {lastResult.divisionChanged && (
          <Card style={[styles.statsCard, styles.promotionCard]}>
            <Text style={styles.promotionTitle}>{t('result.divisionPromotion')}</Text>
            <View style={styles.promotionRow}>
              <DivisionBadge divisionId={division.id} size={40} />
              <Text style={styles.promotionText}>{t('result.newDivision', { division: t(`division.${division.id}`) })}</Text>
            </View>
          </Card>
        )}

        {lastResult.newAchievements.length > 0 && (
          <Card style={styles.statsCard}>
            {lastResult.newAchievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementRow}>
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <Text style={styles.achievementText}>{t(achievement.titleKey)}</Text>
              </View>
            ))}
          </Card>
        )}

        <Text style={styles.pgnSavedText}>{t('result.savedToPgn')}</Text>

        <View style={styles.buttonsWrap}>
          <Button label={t('result.rematch')} onPress={handleRematch} />
          <Button label={t('result.backHome')} variant="secondary" onPress={handleBackHome} />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

function StatLine({ label, value, highlight }: { label: string; value: string; highlight: string }) {
  return (
    <View style={styles.statLine}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: highlight }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  vsText: {
    color: palette.ivoryFaint,
    fontWeight: '700',
  },
  resultTitle: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.hero,
    textAlign: 'center',
  },
  endReasonText: {
    color: palette.ivoryMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  statsCard: {
    gap: spacing.xs,
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    color: palette.ivoryMuted,
  },
  statValue: {
    fontWeight: '700',
  },
  promotionCard: {
    alignItems: 'center',
  },
  promotionTitle: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    color: palette.goldBright,
  },
  promotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  promotionText: {
    color: palette.ivory,
    flexShrink: 1,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  achievementIcon: {
    fontSize: 22,
  },
  achievementText: {
    color: palette.ivory,
    fontWeight: '600',
  },
  pgnSavedText: {
    color: palette.ivoryFaint,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  buttonsWrap: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
