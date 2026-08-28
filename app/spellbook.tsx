import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { SPELLS } from '@/domain/spells';
import { palette } from '@/theme/colors';
import { minTouchTarget, radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

export default function SpellbookScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t('spellbook.title')}</Text>
          <View style={{ width: minTouchTarget }} />
        </View>

        <Text style={styles.subtitle}>{t('spellbook.subtitle')}</Text>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.grid}>
            {SPELLS.map((spell) => (
              <Card key={spell.id} style={styles.spellCard}>
                <Text style={styles.spellIcon}>{spell.icon}</Text>
                <Text style={styles.spellName} numberOfLines={1}>{t(spell.nameKey)}</Text>
                <View style={styles.costPill}>
                  <Text style={styles.costText}>{spell.cost} 🪙</Text>
                </View>
                <Text style={styles.spellDescription}>{t(spell.descriptionKey)}</Text>
              </Card>
            ))}
          </View>
        </ScrollView>
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
  subtitle: {
    color: palette.ivoryMuted,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  spellCard: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
  },
  spellIcon: {
    fontSize: 32,
  },
  spellName: {
    color: palette.ivory,
    fontWeight: '700',
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  costPill: {
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  costText: {
    color: palette.goldBright,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  spellDescription: {
    color: palette.ivoryFaint,
    fontSize: fontSize.xs,
    textAlign: 'center',
    lineHeight: fontSize.xs + 6,
    marginTop: 2,
  },
});
