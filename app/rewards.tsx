import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { ACHIEVEMENTS } from '@/domain/achievements';
import { BOARD_THEMES, PIECE_THEMES } from '@/domain/cosmetics';
import { getDivisionById, DIVISIONS } from '@/domain/divisions';
import { useProfileStore } from '@/store/profileStore';
import { useRewardsStore } from '@/store/rewardsStore';
import { palette } from '@/theme/colors';
import { minTouchTarget, radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

export default function RewardsScreen() {
  const { t } = useTranslation();
  const profile = useProfileStore((s) => s.profile);
  const setActiveBoardTheme = useProfileStore((s) => s.setActiveBoardTheme);
  const setActivePieceTheme = useProfileStore((s) => s.setActivePieceTheme);
  const isUnlocked = useRewardsStore((s) => s.isUnlocked);
  const unlockedList = useRewardsStore((s) => s.unlocked);

  const divisionOrder = getDivisionById(profile.division).order;

  return (
    <ScreenBackgroundSafe title={t('rewards.title')}>
      <Text style={styles.sectionTitle}>{t('rewards.achievementsTitle')}</Text>
      <View style={styles.achievementGrid}>
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = isUnlocked(achievement.id);
          return (
            <Card key={achievement.id} style={[styles.achievementCard, !unlocked && styles.lockedCard]}>
              <Text style={[styles.achievementIcon, !unlocked && styles.lockedText]}>{achievement.icon}</Text>
              <Text style={[styles.achievementTitle, !unlocked && styles.lockedText]} numberOfLines={2}>
                {t(achievement.titleKey)}
              </Text>
              <Text style={[styles.achievementDescription, !unlocked && styles.lockedText]} numberOfLines={2}>
                {t(achievement.descriptionKey)}
              </Text>
            </Card>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>{t('rewards.boardThemes')}</Text>
      <View style={styles.cosmeticList}>
        {BOARD_THEMES.map((theme) => {
          const unlocked = theme.requiredDivisionOrder <= divisionOrder;
          const active = profile.activeBoardTheme === theme.id;
          return (
            <Pressable
              key={theme.id}
              disabled={!unlocked}
              onPress={() => setActiveBoardTheme(theme.id)}
              style={[styles.cosmeticRow, active && styles.cosmeticRowActive]}
            >
              <View style={styles.swatchPair}>
                <View style={[styles.swatch, { backgroundColor: theme.darkSquare }]} />
                <View style={[styles.swatch, { backgroundColor: theme.lightSquare }]} />
              </View>
              <Text style={[styles.cosmeticName, !unlocked && styles.lockedText]}>{t(theme.nameKey)}</Text>
              <Text style={styles.cosmeticStatus}>
                {active ? t('rewards.applied') : unlocked ? t('rewards.apply') : t('rewards.lockedRequirement', { division: t(`division.${DIVISIONS[theme.requiredDivisionOrder]?.id ?? 'bois'}`) })}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>{t('rewards.pieceThemes')}</Text>
      <View style={styles.cosmeticList}>
        {PIECE_THEMES.map((theme) => {
          const unlocked = theme.requiredDivisionOrder <= divisionOrder;
          const active = profile.activePieceTheme === theme.id;
          return (
            <Pressable
              key={theme.id}
              disabled={!unlocked}
              onPress={() => setActivePieceTheme(theme.id)}
              style={[styles.cosmeticRow, active && styles.cosmeticRowActive]}
            >
              <Text style={[styles.pieceGlyphPreview, { color: theme.whiteColor }]}>♞</Text>
              <Text style={[styles.cosmeticName, !unlocked && styles.lockedText]}>{t(theme.nameKey)}</Text>
              <Text style={styles.cosmeticStatus}>
                {active ? t('rewards.applied') : unlocked ? t('rewards.apply') : t('rewards.lockedRequirement', { division: t(`division.${DIVISIONS[theme.requiredDivisionOrder]?.id ?? 'bois'}`) })}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.footnote}>{unlockedList.length} / {ACHIEVEMENTS.length}</Text>
    </ScreenBackgroundSafe>
  );
}

function ScreenBackgroundSafe({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour" style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: minTouchTarget }} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>{children}</ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.voidBlack,
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
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    color: palette.violetBright,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  achievementCard: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
  },
  lockedCard: {
    opacity: 0.45,
  },
  achievementIcon: {
    fontSize: 28,
  },
  achievementTitle: {
    color: palette.ivory,
    fontWeight: '700',
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  achievementDescription: {
    color: palette.ivoryFaint,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  lockedText: {
    color: palette.ivoryFaint,
  },
  cosmeticList: {
    gap: spacing.xs,
  },
  cosmeticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.stonePanel,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  cosmeticRowActive: {
    borderColor: palette.gold,
  },
  swatchPair: {
    flexDirection: 'row',
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: -6,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  pieceGlyphPreview: {
    fontSize: 24,
    width: 30,
    textAlign: 'center',
  },
  cosmeticName: {
    flex: 1,
    color: palette.ivory,
    fontWeight: '600',
  },
  cosmeticStatus: {
    color: palette.ivoryMuted,
    fontSize: fontSize.xs,
  },
  footnote: {
    color: palette.ivoryFaint,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
