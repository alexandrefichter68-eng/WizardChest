import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChessBoard } from '@/components/ChessBoard';
import { getBoardTheme, getPieceTheme } from '@/domain/cosmetics';
import { useHistoryStore } from '@/store/historyStore';
import { useProfileStore } from '@/store/profileStore';
import { palette } from '@/theme/colors';
import { minTouchTarget, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

export default function HistoryDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useHistoryStore((s) => s.entries.find((e) => e.id === id));
  const profile = useProfileStore((s) => s.profile);
  const [copied, setCopied] = useState(false);

  const boardTheme = getBoardTheme(profile.activeBoardTheme);
  const pieceTheme = getPieceTheme(profile.activePieceTheme);
  const boardSize = Math.min(Dimensions.get('window').width - spacing.md * 2, 380);

  if (!entry) {
    router.replace('/history');
    return null;
  }

  const handleCopyPgn = async () => {
    await Clipboard.setStringAsync(entry.pgn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{entry.opponent.username}</Text>
          <View style={{ width: minTouchTarget }} />
        </View>

        <View style={styles.opponentRow}>
          <Avatar avatar={entry.opponent.avatar} size={56} />
          <View>
            <Text style={styles.resultText}>{t(`result.${entry.result}`)}</Text>
            <Text style={styles.metaText}>
              {t('history.playedAs', { color: entry.playerColor === 'w' ? t('history.white') : t('history.black') })}
            </Text>
          </View>
        </View>

        <View style={styles.boardWrap}>
          <Text style={styles.sectionLabel}>{t('history.viewPosition')}</Text>
          <ChessBoard
            fen={entry.finalFen}
            orientation={entry.playerColor === 'w' ? 'white' : 'black'}
            size={boardSize}
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            selectedSquare={null}
            legalTargets={[]}
            lastMove={null}
            checkSquare={null}
            interactive={false}
            onSquareTap={() => {}}
            onPieceDrop={() => {}}
          />
        </View>

        <Card style={styles.pgnCard}>
          <Text style={styles.pgnText} numberOfLines={6}>{entry.pgn}</Text>
        </Card>

        <Button label={copied ? t('history.pgnCopied') : t('history.copyPgn')} onPress={handleCopyPgn} variant="secondary" />
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.voidBlack,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  safeArea: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
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
    fontSize: fontSize.lg,
    color: palette.ivory,
  },
  opponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultText: {
    color: palette.ivory,
    fontWeight: '700',
    fontSize: fontSize.lg,
  },
  metaText: {
    color: palette.ivoryFaint,
    fontSize: fontSize.sm,
  },
  boardWrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionLabel: {
    color: palette.ivoryMuted,
    fontSize: fontSize.sm,
  },
  pgnCard: {},
  pgnText: {
    color: palette.ivoryMuted,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
  },
});
