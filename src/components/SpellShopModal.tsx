import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SPELLS, type SpellId } from '@/domain/spells';
import { palette } from '@/theme/colors';
import { minTouchTarget, radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

interface SpellShopModalProps {
  visible: boolean;
  gold: number;
  ownedCounts: Record<SpellId, number>;
  onBuy: (spellId: SpellId) => void;
  onClose: () => void;
}

export function SpellShopModal({ visible, gold, ownedCounts, onBuy, onClose }: SpellShopModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('spell.shopTitle')}</Text>
            <View style={styles.goldPill}>
              <Text style={styles.goldIcon}>🪙</Text>
              <Text style={styles.goldValue}>{gold}</Text>
            </View>
          </View>
          <Text style={styles.hint}>{t('spell.goldHint')}</Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {SPELLS.map((spell) => {
              const canAfford = gold >= spell.cost;
              const owned = ownedCounts[spell.id] ?? 0;
              return (
                <View key={spell.id} style={styles.spellRow}>
                  <Text style={styles.spellIcon}>{spell.icon}</Text>
                  <View style={styles.spellInfo}>
                    <Text style={styles.spellName}>{t(spell.nameKey)}</Text>
                    <Text style={styles.spellDescription}>{t(spell.descriptionKey)}</Text>
                    {owned > 0 && <Text style={styles.spellOwned}>{t('spell.owned', { count: owned })}</Text>}
                  </View>
                  <Pressable
                    onPress={() => canAfford && onBuy(spell.id)}
                    disabled={!canAfford}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(spell.nameKey)} — ${t('spell.buy')}`}
                    style={({ pressed }) => [
                      styles.buyButton,
                      !canAfford && styles.buyButtonDisabled,
                      pressed && canAfford && styles.buyButtonPressed,
                    ]}
                  >
                    <Text style={styles.buyCost}>{spell.cost} 🪙</Text>
                    <Text style={[styles.buyLabel, !canAfford && styles.buyLabelDisabled]}>
                      {canAfford ? t('spell.buy') : t('spell.notEnoughGold')}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          <Pressable onPress={onClose} accessibilityRole="button" style={styles.closeButton}>
            <Text style={styles.closeLabel}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: palette.overlayScrim,
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: palette.stonePanel,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    color: palette.goldBright,
  },
  goldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderWidth: 1,
    borderColor: palette.gold,
  },
  goldIcon: {
    fontSize: fontSize.md,
  },
  goldValue: {
    color: palette.goldBright,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  hint: {
    color: palette.ivoryFaint,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
    marginBottom: spacing.sm,
  },
  list: {
    marginTop: spacing.xs,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  spellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    padding: spacing.sm,
  },
  spellIcon: {
    fontSize: 30,
  },
  spellInfo: {
    flex: 1,
    gap: 2,
  },
  spellName: {
    color: palette.ivory,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  spellDescription: {
    color: palette.ivoryMuted,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.4,
  },
  spellOwned: {
    color: palette.arcaneBlueBright,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  buyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.violet,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 76,
    minHeight: minTouchTarget,
  },
  buyButtonPressed: {
    opacity: 0.8,
  },
  buyButtonDisabled: {
    backgroundColor: palette.stoneBorder,
  },
  buyCost: {
    color: palette.ivory,
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  buyLabel: {
    color: palette.ivory,
    fontSize: fontSize.xs,
  },
  buyLabelDisabled: {
    color: palette.ivoryFaint,
  },
  closeButton: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  closeLabel: {
    color: palette.ivoryMuted,
    fontWeight: '600',
  },
});
