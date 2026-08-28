import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenBackground } from '@/components/ScreenBackground';
import { EDGAR_BOSS, GARTIN_BOSS } from '@/domain/adventureBoss';
import { getTimeControl } from '@/domain/timeControls';
import { useMatchStore } from '@/store/matchStore';
import { useSettingsStore } from '@/store/settingsStore';
import { palette } from '@/theme/colors';
import { minTouchTarget, radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';
import type { OpponentProfile, PieceColor } from '@/types';

function randomPlayerColor(): PieceColor {
  return Math.random() < 0.5 ? 'w' : 'b';
}

export default function AdventureScreen() {
  const { t } = useTranslation();
  const defaultTimeControl = useSettingsStore((s) => s.settings.defaultTimeControl);
  const startMatch = useMatchStore((s) => s.startMatch);

  const handleFight = (boss: OpponentProfile, playerColor: PieceColor) => {
    // `replace`, not `push` — pushing on top of this screen left it stacked underneath /game,
    // and the leftover mounted screen intercepted taps meant for the board (nothing seemed to
    // respond to clicks). Matches how `matchmaking.tsx` starts a regular match.
    startMatch(boss, getTimeControl(defaultTimeControl), playerColor, { isUntimed: true });
    router.replace('/game');
  };

  const handleBack = () => {
    // Falls back to home instead of a no-op when this screen has no history behind it (e.g.
    // opened directly, or reached after a `replace` elsewhere consumed the previous entry).
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t('adventure.title')}</Text>
          <View style={{ width: minTouchTarget }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <BossCard
            boss={GARTIN_BOSS}
            name={t('adventure.gartinName')}
            lore={t('adventure.gartinLore')}
            noSpellsHint={t('adventure.gartinNoSpellsHint')}
            fightLabel={t('adventure.gartinFightButton')}
            onFight={() => handleFight(GARTIN_BOSS, 'b')}
          />
          <BossCard
            boss={EDGAR_BOSS}
            name={t('adventure.edgarName')}
            lore={t('adventure.edgarLore')}
            noSpellsHint={t('adventure.edgarNoSpellsHint')}
            fightLabel={t('adventure.edgarFightButton')}
            onFight={() => handleFight(EDGAR_BOSS, randomPlayerColor())}
          />
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function BossCard({
  boss,
  name,
  lore,
  noSpellsHint,
  fightLabel,
  onFight,
}: {
  boss: OpponentProfile;
  name: string;
  lore: string;
  noSpellsHint: string;
  fightLabel: string;
  onFight: () => void;
}) {
  return (
    <Card style={styles.bossCard}>
      <Avatar avatar={boss.avatar} size={88} />
      <Text style={styles.bossName}>{name}</Text>
      <Text style={styles.bossLore}>{lore}</Text>
      <Text style={styles.noSpellsHint}>{noSpellsHint}</Text>
      <Button label={fightLabel} onPress={onFight} style={styles.fightButton} />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  bossCard: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    borderColor: palette.violet,
  },
  bossName: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xxl,
    color: palette.ivory,
    textAlign: 'center',
  },
  bossLore: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.md + 6,
    color: palette.ivoryMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  noSpellsHint: {
    fontSize: fontSize.sm,
    color: palette.success,
    textAlign: 'center',
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  fightButton: {
    width: '100%',
    marginTop: spacing.sm,
  },
});
