import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getSpellDef, type SpellId } from '@/domain/spells';
import { palette } from '@/theme/colors';
import { minTouchTarget, radius, spacing } from '@/theme/spacing';
import { fontSize } from '@/theme/typography';

interface SpellBarProps {
  gold: number;
  ownedCounts: Record<SpellId, number>;
  armedSpell: SpellId | null;
  onArm: (spellId: SpellId) => void;
  onOpenShop: () => void;
}

export function SpellBar({ gold, ownedCounts, armedSpell, onArm, onOpenShop }: SpellBarProps) {
  const { t } = useTranslation();
  const ownedSpellIds = (Object.keys(ownedCounts) as SpellId[]).filter((id) => ownedCounts[id] > 0);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onOpenShop}
        accessibilityRole="button"
        accessibilityLabel={t('spell.shopOpen')}
        style={({ pressed }) => [styles.shopButton, pressed && styles.shopButtonPressed]}
      >
        <Text style={styles.shopIcon}>🛒</Text>
        <View style={styles.goldPill}>
          <Text style={styles.goldIcon}>🪙</Text>
          <Text style={styles.goldValue}>{gold}</Text>
        </View>
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.spellsContent}>
        {ownedSpellIds.length === 0 ? (
          <Text style={styles.emptyText} numberOfLines={1}>{t('spell.noSpells')}</Text>
        ) : (
          ownedSpellIds.map((id) => {
            const def = getSpellDef(id);
            const count = ownedCounts[id];
            const armed = armedSpell === id;
            return (
              <Pressable
                key={id}
                onPress={() => onArm(id)}
                accessibilityRole="button"
                accessibilityLabel={t(def.nameKey)}
                style={({ pressed }) => [styles.spellChip, armed && styles.spellChipArmed, pressed && styles.spellChipPressed]}
              >
                <Text style={styles.spellIcon}>{def.icon}</Text>
                {count > 1 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    paddingHorizontal: spacing.sm,
    minHeight: minTouchTarget,
  },
  shopButtonPressed: {
    opacity: 0.7,
  },
  shopIcon: {
    fontSize: 18,
  },
  goldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  goldIcon: {
    fontSize: fontSize.sm,
  },
  goldValue: {
    color: palette.goldBright,
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  spellsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
  emptyText: {
    color: palette.ivoryFaint,
    fontSize: fontSize.xs,
    maxWidth: 220,
  },
  spellChip: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.stonePanel,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  spellChipArmed: {
    borderColor: palette.gold,
    backgroundColor: palette.stonePanelRaised,
  },
  spellChipPressed: {
    opacity: 0.7,
  },
  spellIcon: {
    fontSize: 22,
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: palette.violet,
    borderRadius: radius.pill,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  countText: {
    color: palette.ivory,
    fontSize: 10,
    fontWeight: '700',
  },
});
