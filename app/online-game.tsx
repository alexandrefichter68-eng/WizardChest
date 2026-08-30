import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { ChessBoard } from '@/components/ChessBoard';
import { ConfirmModal } from '@/components/ConfirmModal';
import { PromotionModal } from '@/components/PromotionModal';
import { getBoardTheme, getPieceTheme } from '@/domain/cosmetics';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { palette } from '@/theme/colors';
import { minTouchTarget, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

interface LiveMatchRow {
  id: string;
  white_id: string;
  black_id: string;
  fen: string;
  pgn: string;
  status: 'active' | 'finished';
  winner: 'white' | 'black' | 'draw' | null;
}

interface Participants {
  white: string;
  black: string;
}

/**
 * First real-time PvP screen — deliberately plain chess, no spells. Every spell effect in the
 * local `game.tsx` mutates the board directly and assumes a single trusted client; syncing that
 * safely between two independent clients over the network is its own project, scoped out here on
 * purpose so the realtime skeleton (matchmaking -> live board sync -> game end) ships and gets
 * verified first.
 */
export default function OnlineGameScreen() {
  const { t } = useTranslation();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const myId = useAuthStore((s) => s.session?.user.id);
  const boardTheme = useProfileStore((s) => getBoardTheme(s.profile.activeBoardTheme));
  const pieceTheme = useProfileStore((s) => getPieceTheme(s.profile.activePieceTheme));

  const [match, setMatch] = useState<LiveMatchRow | null>(null);
  const [participants, setParticipants] = useState<Participants | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);
  const [resignConfirmOpen, setResignConfirmOpen] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;

    void supabase
      .from('live_matches')
      .select('*')
      .eq('id', matchId)
      .single()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setLoadError(t('onlineGame.loadError'));
          return;
        }
        setMatch(data as LiveMatchRow);
        const row = data as LiveMatchRow;
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', [row.white_id, row.black_id]);
        if (cancelled || !profiles) return;
        const white = profiles.find((p) => p.id === row.white_id)?.username ?? '?';
        const black = profiles.find((p) => p.id === row.black_id)?.username ?? '?';
        setParticipants({ white, black });
      });

    const channel = supabase
      .channel(`live-match-${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_matches', filter: `id=eq.${matchId}` }, (payload) => {
        setMatch(payload.new as LiveMatchRow);
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [matchId, t]);

  const chess = useMemo(() => (match ? new Chess(match.fen) : null), [match]);
  const myColor: 'w' | 'b' | null = match && myId ? (match.white_id === myId ? 'w' : 'b') : null;
  const isMyTurn = !!(chess && myColor && match?.status === 'active' && chess.turn() === myColor);

  const legalTargets = useMemo(() => {
    if (!chess || !selectedSquare) return [];
    return chess.moves({ square: selectedSquare, verbose: true }).map((m) => m.to);
  }, [chess, selectedSquare]);

  const commitMove = async (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (!match || !chess) return;
    const next = new Chess(match.fen);
    const move = next.move({ from, to, promotion });
    if (!move) return;

    let status: LiveMatchRow['status'] = match.status;
    let winner: LiveMatchRow['winner'] = match.winner;
    if (next.isGameOver()) {
      status = 'finished';
      winner = next.isCheckmate() ? (move.color === 'w' ? 'white' : 'black') : 'draw';
    }

    const updated: LiveMatchRow = { ...match, fen: next.fen(), pgn: next.pgn(), status, winner };
    setMatch(updated);
    await supabase
      .from('live_matches')
      .update({ fen: updated.fen, pgn: updated.pgn, status, winner, updated_at: new Date().toISOString() })
      .eq('id', match.id);
  };

  const handleSquareTap = (square: Square) => {
    if (!chess || !isMyTurn) return;
    if (selectedSquare && legalTargets.includes(square)) {
      const piece = chess.get(selectedSquare);
      const isPromotion = piece?.type === 'p' && (square[1] === '8' || square[1] === '1');
      if (isPromotion) {
        setPromotionPending({ from: selectedSquare, to: square });
      } else {
        void commitMove(selectedSquare, square);
      }
      setSelectedSquare(null);
      return;
    }
    const piece = chess.get(square);
    if (piece && piece.color === myColor) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  };

  const handlePieceDrop = (from: Square, to: Square) => {
    if (!chess || !isMyTurn) return;
    const piece = chess.get(from);
    if (!piece || piece.color !== myColor) return;
    const legal = chess.moves({ square: from, verbose: true }).map((m) => m.to);
    if (!legal.includes(to)) return;
    const isPromotion = piece.type === 'p' && (to[1] === '8' || to[1] === '1');
    if (isPromotion) setPromotionPending({ from, to });
    else void commitMove(from, to);
  };

  const handlePromotionSelect = (piece: PieceSymbol) => {
    if (!promotionPending) return;
    void commitMove(promotionPending.from, promotionPending.to, piece);
    setPromotionPending(null);
  };

  const handleResign = async () => {
    if (!match || !myColor) return;
    setResignConfirmOpen(false);
    await supabase
      .from('live_matches')
      .update({ status: 'finished', winner: myColor === 'w' ? 'black' : 'white', updated_at: new Date().toISOString() })
      .eq('id', match.id);
  };

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const boardSize = Math.max(200, Math.min(windowWidth - spacing.md * 2, windowHeight * 0.6, 640));

  if (loadError) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.center}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Button label={t('common.back')} onPress={() => router.replace('/home')} style={{ marginTop: spacing.md }} />
        </SafeAreaView>
      </View>
    );
  }

  if (!match || !chess || !myColor) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator color={palette.violetBright} />
        </SafeAreaView>
      </View>
    );
  }

  const whiteName = participants?.white ?? '…';
  const blackName = participants?.black ?? '…';
  const myName = myColor === 'w' ? whiteName : blackName;
  const opponentName = myColor === 'w' ? blackName : whiteName;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/home')} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{opponentName}</Text>
          <View style={{ width: minTouchTarget }} />
        </View>

        {match.status === 'finished' ? (
          <View style={styles.resultBanner}>
            <Text style={styles.resultText}>
              {match.winner === 'draw'
                ? t('onlineGame.draw')
                : (match.winner === 'white' ? whiteName : blackName) === myName
                  ? t('onlineGame.youWon')
                  : t('onlineGame.youLost')}
            </Text>
          </View>
        ) : (
          <Text style={styles.turnText}>{isMyTurn ? t('onlineGame.yourTurn') : t('onlineGame.opponentTurn')}</Text>
        )}

        <View style={styles.boardWrap}>
          <ChessBoard
            fen={match.fen}
            orientation={myColor === 'w' ? 'white' : 'black'}
            size={boardSize}
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            lastMove={null}
            checkSquare={null}
            interactive={isMyTurn}
            onSquareTap={handleSquareTap}
            onPieceDrop={handlePieceDrop}
          />
        </View>

        <Text style={styles.myNameText}>{myName}</Text>

        {match.status === 'active' && (
          <Button label={t('onlineGame.resign')} variant="danger" onPress={() => setResignConfirmOpen(true)} style={styles.resignButton} />
        )}
      </SafeAreaView>

      <PromotionModal visible={!!promotionPending} color={myColor} pieceTheme={pieceTheme} onSelect={handlePromotionSelect} />
      <ConfirmModal
        visible={resignConfirmOpen}
        title={t('onlineGame.resignConfirmTitle')}
        body={t('onlineGame.resignConfirmBody')}
        confirmLabel={t('onlineGame.resign')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => void handleResign()}
        onCancel={() => setResignConfirmOpen(false)}
      />
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
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    width: '100%',
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
  turnText: {
    color: palette.violetBright,
    fontWeight: '700',
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
  },
  resultBanner: {
    marginBottom: spacing.sm,
  },
  resultText: {
    color: palette.goldBright,
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
  },
  boardWrap: {
    marginVertical: spacing.sm,
  },
  myNameText: {
    color: palette.ivoryMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  resignButton: {
    marginTop: spacing.md,
  },
  errorText: {
    color: palette.danger,
    fontSize: fontSize.md,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
