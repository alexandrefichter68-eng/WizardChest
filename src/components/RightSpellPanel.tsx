import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SPELLS, getSpellDef, type OwnedSpell, type SpellId } from '@/domain/spells';
import { palette } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

function countBySpell(owned: OwnedSpell[]): Partial<Record<SpellId, number>> {
  const counts: Partial<Record<SpellId, number>> = {};
  for (const spell of owned) counts[spell.spellId] = (counts[spell.spellId] ?? 0) + 1;
  return counts;
}

interface RightSpellPanelProps {
  gold: number;
  ownedSpells: OwnedSpell[];
  aiOwnedSpells: OwnedSpell[];
  armedSpell: SpellId | null;
  onArm: (spellId: SpellId) => void;
  onBuy: (spellId: SpellId) => void;
  width?: number;
}

/** Always-open right sidebar: opponent's purchased spells on top, the shop, then the player's own castable inventory. */
export function RightSpellPanel({ gold, ownedSpells, aiOwnedSpells, armedSpell, onArm, onBuy, width = 116 }: RightSpellPanelProps) {
  const { t } = useTranslation();
  const ownedCounts = countBySpell(ownedSpells);
  const aiCounts = countBySpell(aiOwnedSpells);
  const ownedIds = (Object.keys(ownedCounts) as SpellId[]).filter((id) => (ownedCounts[id] ?? 0) > 0);
  const aiIds = (Object.keys(aiCounts) as SpellId[]).filter((id) => (aiCounts[id] ?? 0) > 0);

  return (
    <View style={[styles.panel, { width }]}>
      <Text style={styles.sectionTitle}>{t('spell.enemySpells')}</Text>
      <ScrollView style={styles.enemyRow} contentContainerStyle={styles.chipRow}>
        {aiIds.length === 0 ? (
          <Text style={styles.emptyText}>{t('spell.noEnemySpells')}</Text>
        ) : (
          aiIds.map((id) => (
            <View key={id} style={styles.chip}>
              <Text style={styles.chipIcon}>{getSpellDef(id).icon}</Text>
              {(aiCounts[id] ?? 0) > 1 && <Text style={styles.chipCount}>×{aiCounts[id]}</Text>}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.divider} />

      <View style={styles.shopHeader}>
        <Text style={styles.sectionTitle}>{t('spell.shopTitle')}</Text>
        <View style={styles.goldPill}>
          <Text style={styles.goldIcon}>🪙</Text>
          <Text style={styles.goldValue}>{gold}</Text>
        </View>
      </View>
      <ScrollView style={styles.shopList} contentContainerStyle={styles.shopContent}>
        {SPELLS.map((spell) => {
          const canAfford = gold >= spell.cost;
          return (
            <Pressable
              key={spell.id}
              onPress={() => canAfford && onBuy(spell.id)}
              disabled={!canAfford}
              accessibilityRole="button"
              accessibilityLabel={`${t(spell.nameKey)} — ${t('spell.buy')}`}
              style={({ pressed }) => [styles.shopRow, !canAfford && styles.shopRowDisabled, pressed && canAfford && styles.shopRowPressed]}
            >
              <Text style={styles.chipIcon}>{spell.icon}</Text>
              <View style={styles.shopInfo}>
                <Text style={styles.shopName} numberOfLines={1}>{t(spell.nameKey)}</Text>
                <Text style={styles.shopCost}>{spell.cost} 🪙</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>{t('spell.yourSpells')}</Text>
      <ScrollView style={styles.inventoryList} contentContainerStyle={styles.chipRow}>
        {ownedIds.length === 0 ? (
          <Text style={styles.emptyText}>{t('spell.noSpells')}</Text>
        ) : (
          ownedIds.map((id) => {
            const armed = armedSpell === id;
            return (
              <Pressable
                key={id}
                onPress={() => onArm(id)}
                accessibilityRole="button"
                accessibilityLabel={t(getSpellDef(id).nameKey)}
                style={[styles.chip, armed && styles.chipArmed]}
              >
                <Text style={styles.chipIcon}>{getSpellDef(id).icon}</Text>
                {(ownedCounts[id] ?? 0) > 1 && <Text style={styles.chipCount}>×{ownedCounts[id]}</Text>}
              </Pressable>
            );
          })
        )}
      </ScrollView>
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
  enemyRow: {
    maxHeight: 60,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  goldIcon: {
    fontSize: fontSize.xs,
  },
  goldValue: {
    color: palette.goldBright,
    fontWeight: '700',
    fontSize: fontSize.xs,
  },
  shopList: {
    maxHeight: 180,
  },
  shopContent: {
    gap: 4,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    padding: 4,
  },
  shopRowDisabled: {
    opacity: 0.4,
  },
  shopRowPressed: {
    opacity: 0.7,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    color: palette.ivory,
    fontSize: 10,
    fontWeight: '600',
  },
  shopCost: {
    color: palette.goldBright,
    fontSize: 10,
  },
  inventoryList: {
    maxHeight: 100,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  emptyText: {
    color: palette.ivoryFaint,
    fontSize: 9,
    lineHeight: 12,
  },
  chip: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.stonePanelRaised,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  chipArmed: {
    borderColor: palette.gold,
    backgroundColor: palette.violet,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipCount: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 8,
    color: palette.ivory,
    backgroundColor: palette.violet,
    borderRadius: radius.pill,
    paddingHorizontal: 2,
  },
});
