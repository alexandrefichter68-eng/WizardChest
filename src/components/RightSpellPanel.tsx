import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MAX_OWNED_SPELLS, SPELLS, getSpellDef, type OwnedSpell, type SpellId } from '@/domain/spells';
import { palette } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

function countAiCopies(owned: OwnedSpell[]): Partial<Record<SpellId, number>> {
  // Only the AI's cosmetic flavor-purchase bar can ever show more than one copy of a spell — the
  // player is capped at one unspent copy at a time (see `alreadyOwnedHint`), but the AI's random
  // purchase loop in game.tsx isn't bound by that rule since it's never actually cast.
  const counts: Partial<Record<SpellId, number>> = {};
  for (const spell of owned) counts[spell.spellId] = (counts[spell.spellId] ?? 0) + 1;
  return counts;
}

interface RightSpellPanelProps {
  gold: number;
  ownedSpells: OwnedSpell[];
  aiOwnedSpells: OwnedSpell[];
  armedSpell: SpellId | null;
  /** True once a spell has already been cast this turn — the one-spell-per-turn rule. Buying stays enabled. */
  castingDisabled?: boolean;
  /** Restricts the shop to only these spell ids (e.g. Gartin's fight only teaches Cataclysme) — undefined shows every spell. */
  availableSpellIds?: string[];
  /** True in Entraînement mode — every shop purchase costs no gold, still capped by MAX_OWNED_SPELLS. */
  freeSpells?: boolean;
  onArm: (spellId: SpellId) => void;
  onBuy: (spellId: SpellId) => void;
  width?: number;
}

type HoveredSpell = { id: SpellId; context: 'shop' | 'inventory' };

/** Always-open right sidebar: opponent's purchased spells on top, the shop, then the player's own castable inventory. */
export function RightSpellPanel({
  gold,
  ownedSpells,
  aiOwnedSpells,
  armedSpell,
  castingDisabled,
  availableSpellIds,
  freeSpells,
  onArm,
  onBuy,
  width = 116,
}: RightSpellPanelProps) {
  const { t } = useTranslation();
  const shopSpells = availableSpellIds ? SPELLS.filter((s) => availableSpellIds.includes(s.id)) : SPELLS;
  // At most one unspent copy per spell, so this is really just "which ids are owned" — no count
  // badges needed on the player's own inventory chips anymore.
  const ownedSpellIds = new Set(ownedSpells.map((s) => s.spellId));
  const inventoryFull = ownedSpells.length >= MAX_OWNED_SPELLS;
  const aiCounts = countAiCopies(aiOwnedSpells);
  const aiIds = (Object.keys(aiCounts) as SpellId[]).filter((id) => (aiCounts[id] ?? 0) > 0);
  // Hover-to-preview (mouse/trackpad on web only — Pressable's onHoverIn/Out are no-ops on
  // touch), so players can read a spell's effect — and, if it's currently unusable, why — before
  // spending gold on it or trying to cast it.
  const [hovered, setHovered] = useState<HoveredSpell | null>(null);

  const tooltipReason = (() => {
    if (!hovered) return null;
    if (hovered.context === 'shop') {
      if (ownedSpellIds.has(hovered.id)) return t('spell.alreadyOwnedHint');
      if (inventoryFull) return t('spell.inventoryFullHint');
      return null;
    }
    const owned = ownedSpells.find((s) => s.spellId === hovered.id);
    if (owned?.boughtThisTurn) return t('spell.boughtThisTurnHint');
    if (castingDisabled && armedSpell !== hovered.id) return t('spell.oneSpellPerTurnHint');
    return null;
  })();

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
        {shopSpells.map((spell) => {
          const alreadyOwned = ownedSpellIds.has(spell.id);
          const affordable = freeSpells || gold >= spell.cost;
          const canBuy = affordable && !alreadyOwned && !inventoryFull;
          return (
            <Pressable
              key={spell.id}
              onPress={() => canBuy && onBuy(spell.id)}
              onHoverIn={() => setHovered({ id: spell.id, context: 'shop' })}
              onHoverOut={() => setHovered((current) => (current?.id === spell.id && current.context === 'shop' ? null : current))}
              accessibilityRole="button"
              accessibilityLabel={`${t(spell.nameKey)} — ${t('spell.buy')}`}
              accessibilityState={{ disabled: !canBuy }}
              style={({ pressed }) => [styles.shopRow, !canBuy && styles.shopRowDisabled, pressed && canBuy && styles.shopRowPressed]}
            >
              <Text style={styles.chipIcon}>{spell.icon}</Text>
              <View style={styles.shopInfo}>
                <Text style={styles.shopName} numberOfLines={1}>{t(spell.nameKey)}</Text>
                <Text style={styles.shopCost}>{freeSpells ? t('spell.free') : `${spell.cost} 🪙`}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.divider} />

      <View style={styles.shopHeader}>
        <Text style={styles.sectionTitle}>{t('spell.yourSpells')}</Text>
        {castingDisabled && <Text style={styles.turnLimitHint}>{t('spell.oneSpellPerTurn')}</Text>}
      </View>
      <ScrollView style={styles.inventoryList} contentContainerStyle={styles.chipRow}>
        {ownedSpells.length === 0 ? (
          <Text style={styles.emptyText}>{t('spell.noSpells')}</Text>
        ) : (
          ownedSpells.map((owned) => {
            const id = owned.spellId;
            const armed = armedSpell === id;
            const disabled = owned.boughtThisTurn || (castingDisabled && !armed);
            return (
              <Pressable
                key={owned.instanceId}
                onPress={() => !disabled && onArm(id)}
                onHoverIn={() => setHovered({ id, context: 'inventory' })}
                onHoverOut={() => setHovered((current) => (current?.id === id && current.context === 'inventory' ? null : current))}
                accessibilityRole="button"
                accessibilityLabel={t(getSpellDef(id).nameKey)}
                accessibilityState={{ disabled }}
                style={[styles.chip, armed && styles.chipArmed, disabled && styles.chipDisabled]}
              >
                <Text style={styles.chipIcon}>{getSpellDef(id).icon}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {hovered && (
        <View style={styles.tooltip} pointerEvents="none">
          <Text style={styles.tooltipTitle}>{t(getSpellDef(hovered.id).nameKey)}</Text>
          <Text style={styles.tooltipText}>{t(getSpellDef(hovered.id).descriptionKey)}</Text>
          {tooltipReason && <Text style={styles.tooltipReason}>{tooltipReason}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'relative',
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
  enemyRow: {
    maxHeight: 76,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goldIcon: {
    fontSize: fontSize.md,
  },
  goldValue: {
    color: palette.goldBright,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  shopList: {
    maxHeight: 230,
  },
  shopContent: {
    gap: 6,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    padding: 6,
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
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  shopCost: {
    color: palette.goldBright,
    fontSize: fontSize.sm,
  },
  tooltip: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: palette.stoneDark,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.violet,
    padding: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    gap: 2,
  },
  tooltipTitle: {
    color: palette.violetBright,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  tooltipText: {
    color: palette.ivory,
    fontSize: fontSize.sm,
    lineHeight: fontSize.md + 4,
  },
  tooltipReason: {
    color: palette.goldBright,
    fontSize: fontSize.xs,
    fontStyle: 'italic',
    marginTop: 2,
  },
  inventoryList: {
    maxHeight: 130,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emptyText: {
    color: palette.ivoryFaint,
    fontSize: fontSize.sm,
    lineHeight: fontSize.md,
  },
  chip: {
    width: 54,
    height: 54,
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
  chipDisabled: {
    opacity: 0.35,
  },
  turnLimitHint: {
    color: palette.ivoryFaint,
    fontSize: fontSize.xs,
    fontStyle: 'italic',
  },
  chipIcon: {
    fontSize: 28,
  },
  chipCount: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    fontSize: 12,
    color: palette.ivory,
    backgroundColor: palette.violet,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
  },
});
