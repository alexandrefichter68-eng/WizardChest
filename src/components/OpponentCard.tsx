import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { DivisionBadge } from '@/components/DivisionBadge';
import { FlagBadge } from '@/components/FlagBadge';
import { getDivisionById } from '@/domain/divisions';
import { palette } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';
import type { OpponentProfile } from '@/types';

interface OpponentCardProps {
  opponent: OpponentProfile;
}

export function OpponentCard({ opponent }: OpponentCardProps) {
  const { t } = useTranslation();
  const division = getDivisionById(opponent.division);

  return (
    <View style={styles.card}>
      <Avatar avatar={opponent.avatar} size={72} />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.username} numberOfLines={1}>
            {opponent.username}
          </Text>
          <FlagBadge countryCode={opponent.countryCode} />
        </View>
        <View style={styles.statsRow}>
          <DivisionBadge divisionId={opponent.division} size={22} />
          <Text style={styles.eloText}>{opponent.elo} {t('common.elo')}</Text>
        </View>
        <Text style={styles.metaText}>
          {Math.round(opponent.winRate * 100)}% · {opponent.gamesPlayed} {t('common.games')}
        </Text>
        <Text style={[styles.metaText, { color: division.color }]}>{t(`division.${division.id}`)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.stonePanel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    padding: spacing.md,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  username: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    color: palette.ivory,
    flexShrink: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eloText: {
    color: palette.goldBright,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  metaText: {
    color: palette.ivoryFaint,
    fontSize: fontSize.sm,
  },
});
