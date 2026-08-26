import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setMusicVolume } from '@/audio/sounds';
import { Avatar } from '@/components/Avatar';
import { ChessBoard } from '@/components/ChessBoard';
import { ConfirmModal } from '@/components/ConfirmModal';
import { GameOverPanel } from '@/components/GameOverPanel';
import { LeftGamePanel, type ChatEntry } from '@/components/LeftGamePanel';
import { PromotionModal } from '@/components/PromotionModal';
import { RightSpellPanel } from '@/components/RightSpellPanel';
import { ZoomableBoard } from '@/components/ZoomableBoard';
import { computeAiMove } from '@/engine/aiPlayer';
import { findKingSquare, isEnemyKingAttacked } from '@/engine/boardUtils';
import { applyCelesteMove, getCelesteDestinations } from '@/engine/celesteMoves';
import { evaluatePosition } from '@/engine/evaluation';
import { applyLeapMove, getLeapDestinations } from '@/engine/leapMoves';
import { applyCorruption, applyExplosion, applyTeleport, getBlastSquares, getOrthogonalAdjacentSquares } from '@/engine/spellEffects';
import { evaluateAchievements } from '@/domain/achievementRules';
import { getBoardTheme, getPieceTheme } from '@/domain/cosmetics';
import { getDivisionById } from '@/domain/divisions';
import { CAPTURE_GOLD_VALUE, SPELLS, getSpellDef, nextCheckGoldReward, type OwnedSpell, type SpellId } from '@/domain/spells';
import { computeXpGain } from '@/domain/xp';
import { useHaptics } from '@/hooks/useHaptics';
import { useSfx } from '@/hooks/useSfx';
import { useHistoryStore } from '@/store/historyStore';
import { useMatchStore } from '@/store/matchStore';
import { useProfileStore } from '@/store/profileStore';
import { useRewardsStore } from '@/store/rewardsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { palette } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';
import type { GameEndReason, GameResultKind, OpponentProfile, PieceColor, PlayerProfile } from '@/types';

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function opponentAcceptsDraw(chess: Chess): boolean {
  // The AI "considers" the draw offer using its own evaluation of the current position: it
  // accepts when the position looks roughly balanced or worse for it, declines when it judges
  // itself clearly better.
  const evalCp = evaluatePosition(chess, null);
  return evalCp <= 60;
}

export default function GameScreen() {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const playSfx = useSfx();

  const opponent = useMatchStore((s) => s.opponent);
  const timeControl = useMatchStore((s) => s.timeControl);
  const playerColor = useMatchStore((s) => s.playerColor);
  const setLastResult = useMatchStore((s) => s.setLastResult);
  const clearMatch = useMatchStore((s) => s.clearMatch);

  const profile = useProfileStore((s) => s.profile);
  const applyGameResult = useProfileStore((s) => s.applyGameResult);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);
  const unlockAchievements = useRewardsStore((s) => s.unlockMany);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const boardTheme = getBoardTheme(profile.activeBoardTheme);
  const pieceTheme = getPieceTheme(profile.activePieceTheme);

  const chessRef = useRef(new Chess());
  const startedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const aiDispatchedForFenRef = useRef<string | null>(null);
  const checksDeliveredRef = useRef(0);
  const aiChecksDeliveredRef = useRef(0);
  const deadAllyPiecesRef = useRef<PieceSymbol[]>([]);

  const [fen, setFen] = useState(() => new Chess().fen());
  const derivedChess = useMemo(() => new Chess(fen), [fen]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square; isLeap: boolean } | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [drawOfferMessage, setDrawOfferMessage] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [pendingGameOver, setPendingGameOver] = useState<{ result: GameResultKind; endReason: GameEndReason } | null>(null);
  const [resignConfirmVisible, setResignConfirmVisible] = useState(false);

  // Ephemeral spell economy — resets every match, never persisted.
  const [gold, setGold] = useState(0);
  const [ownedSpells, setOwnedSpells] = useState<OwnedSpell[]>([]);
  const [armedSpell, setArmedSpell] = useState<SpellId | null>(null);
  const [spellCastTargets, setSpellCastTargets] = useState<Square[]>([]);
  const [shieldedSquare, setShieldedSquare] = useState<Square | null>(null);
  const [shieldArmedForAiTurn, setShieldArmedForAiTurn] = useState(false);
  const [leapArmedSquare, setLeapArmedSquare] = useState<Square | null>(null);
  const [celesteArmedSquare, setCelesteArmedSquare] = useState<Square | null>(null);
  const [resurrectionArmedSquare, setResurrectionArmedSquare] = useState<Square | null>(null);
  const [entraveArmedSquare, setEntraveArmedSquare] = useState<Square | null>(null);
  const [entraveArmedForAiTurn, setEntraveArmedForAiTurn] = useState(false);
  const [explosionPreviewSquares, setExplosionPreviewSquares] = useState<Square[]>([]);
  const [isSpellResolving, setIsSpellResolving] = useState(false);
  const [ghostCheckMessage, setGhostCheckMessage] = useState<string | null>(null);

  // The AI's mirror economy — it only ever buys spells at random, purely as flavor visible in the
  // opponent spell bar; it never arms or casts any of them. Gold itself is never displayed, so it
  // lives in a ref (spent synchronously in finishMoveEffects) rather than triggering re-renders.
  const aiGoldRef = useRef(0);
  const [aiOwnedSpells, setAiOwnedSpells] = useState<OwnedSpell[]>([]);

  // Local match chat — no real multiplayer backend (see settings.aiDisclaimer), so this is just
  // the player's own outgoing messages plus a system line, never a simulated opponent reply.
  const [chatMessages, setChatMessages] = useState<ChatEntry[]>(() =>
    opponent ? [{ id: 'system-start', from: 'system', text: t('game.chatSystemJoined', { name: opponent.username }) }] : [],
  );

  const initial = timeControl?.initialSeconds ?? 300;
  const [whiteMs, setWhiteMs] = useState(initial * 1000);
  const [blackMs, setBlackMs] = useState(initial * 1000);

  const resolvedPlayerColor: PieceColor = playerColor ?? 'w';
  const opponentColor: PieceColor = resolvedPlayerColor === 'w' ? 'b' : 'w';

  useEffect(() => {
    if (!opponent || !timeControl) {
      router.replace('/home');
      return;
    }
    const chess = chessRef.current;
    startedAtRef.current = Date.now();
    const whiteName = resolvedPlayerColor === 'w' ? profile.username : opponent.username;
    const blackName = resolvedPlayerColor === 'b' ? profile.username : opponent.username;
    try {
      chess.header('Event', 'Wizard Chest', 'White', whiteName, 'Black', blackName, 'Date', new Date().toISOString().slice(0, 10));
    } catch {
      // Header formatting is cosmetic only; ignore failures.
    }
    playSfx('gameStart');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orientation = flipped
    ? resolvedPlayerColor === 'w' ? 'black' : 'white'
    : settings.boardOrientation === 'black'
      ? 'black'
      : settings.boardOrientation === 'white'
        ? 'white'
        : resolvedPlayerColor === 'w'
          ? 'white'
          : 'black';

  const isPlayerTurn = !isGameOver && derivedChess.turn() === resolvedPlayerColor && !promotionPending && !isAiThinking && !isSpellResolving;
  const checkSquare = derivedChess.inCheck() ? findKingSquare(derivedChess, derivedChess.turn()) : null;

  // Squares highlighted while a spell is armed, replacing normal move highlighting. Most spells
  // target an allied non-king piece; Entrave and Corruption instead target an enemy piece meeting
  // their own condition (in attack range / orthogonally adjacent to an ally).
  const spellHighlightTargets = useMemo(() => {
    if (!armedSpell) return [];
    const squares: Square[] = [];
    for (const row of derivedChess.board()) {
      for (const cell of row) {
        if (!cell) continue;
        if (armedSpell === 'explosion') {
          if (cell.color === resolvedPlayerColor && cell.type === 'p') squares.push(cell.square);
          continue;
        }
        if (armedSpell === 'entrave') {
          if (cell.color === opponentColor && cell.type !== 'k' && derivedChess.isAttacked(cell.square, resolvedPlayerColor)) {
            squares.push(cell.square);
          }
          continue;
        }
        if (armedSpell === 'corruption') {
          if (
            cell.color === opponentColor &&
            cell.type !== 'k' &&
            getOrthogonalAdjacentSquares(cell.square).some((sq) => derivedChess.get(sq)?.color === resolvedPlayerColor)
          ) {
            squares.push(cell.square);
          }
          continue;
        }
        // teleport / shield / leap / celeste / resurrection: own non-king pieces.
        if (cell.color === resolvedPlayerColor && cell.type !== 'k' && !spellCastTargets.includes(cell.square)) {
          squares.push(cell.square);
        }
      }
    }
    return squares;
  }, [armedSpell, derivedChess, resolvedPlayerColor, opponentColor, spellCastTargets]);

  const finalizeGame = useCallback(
    (result: GameResultKind, endReason: GameEndReason) => {
      if (finishedRef.current || !opponent) return;
      finishedRef.current = true;
      setIsGameOver(true);
      setArmedSpell(null);
      setSpellCastTargets([]);

      const chess = chessRef.current;
      const moveHistory = chess.history({ verbose: true });
      const moveCount = moveHistory.length;
      const didPromotePawn = moveHistory.some((m) => m.promotion);
      const lastMoveEntry = moveHistory[moveHistory.length - 1];
      const checkmateDeliveredByKnight =
        result === 'win' && endReason === 'checkmate' && lastMoveEntry?.piece === 'n' && lastMoveEntry.color === resolvedPlayerColor;

      const xp = computeXpGain({
        result,
        endReason,
        winStreak: profile.winStreak + (result === 'win' ? 1 : 0),
        moveCount,
        opponentDivisionOrder: getDivisionById(opponent.division).order,
      });

      const outcome = applyGameResult({ result, opponentElo: opponent.elo, xpGained: xp.total });

      const divisionAfter = getDivisionById(
        // profile store already updated division synchronously in applyGameResult
        useProfileStore.getState().profile.division,
      );
      const divisionChangedUp = outcome.divisionChanged && divisionAfter.order > getDivisionById(profile.division).order;

      const newAchievements = unlockAchievements(
        evaluateAchievements({
          result,
          endReason,
          moveCount,
          winStreakAfter: useProfileStore.getState().profile.winStreak,
          gamesPlayedAfter: useProfileStore.getState().profile.gamesPlayed,
          divisionAfter: divisionAfter.id,
          divisionChangedUp,
          didPromotePawn,
          checkmateDeliveredByKnight,
        }),
      );

      const historyEntryId = `game-${Date.now()}`;
      const durationMs = Date.now() - startedAtRef.current;

      addHistoryEntry({
        id: historyEntryId,
        playedAt: startedAtRef.current,
        durationMs,
        result,
        endReason,
        playerColor: resolvedPlayerColor,
        opponent,
        eloBefore: outcome.eloBefore,
        eloAfter: outcome.eloAfter,
        xpGained: xp.total,
        pgn: chess.pgn(),
        finalFen: chess.fen(),
        moveCount,
      });

      setLastResult({
        result,
        endReason,
        opponent,
        playerColor: resolvedPlayerColor,
        eloBefore: outcome.eloBefore,
        eloAfter: outcome.eloAfter,
        xp,
        divisionChanged: outcome.divisionChanged,
        leveledUp: outcome.leveledUp,
        newAchievements,
        pgn: chess.pgn(),
        finalFen: chess.fen(),
        moveCount,
        durationMs,
        historyEntryId,
      });

      // Stay on the final position instead of navigating away immediately — the player chooses
      // when to move on via the game-over panel (see docs in GameOverPanel).
      setPendingGameOver({ result, endReason });
    },
    [opponent, profile.winStreak, profile.division, applyGameResult, unlockAchievements, addHistoryEntry, setLastResult, resolvedPlayerColor],
  );

  const checkForSpellInducedGameOver = useCallback(() => {
    const chess = chessRef.current;
    if (chess.isCheckmate()) {
      finalizeGame('loss', 'checkmate');
      return true;
    }
    if (chess.isStalemate()) {
      finalizeGame('draw', 'stalemate');
      return true;
    }
    return false;
  }, [finalizeGame]);

  /**
   * "Échec fantôme" (dev-internal name only — see docs): a spell that mutates the board mid-turn
   * (Cataclysme, Téléportation, Corruption) can expose the enemy king without the turn ever
   * passing, so chess.js's own `inCheck()` — which always reports on the side to move — can't see
   * it. This checks the *opponent's* king directly, awards the same progressive gold a real check
   * would, and deliberately does NOT touch checkmate/turn logic: it's not a real check, just one
   * that pays out — the caster still finishes their own move afterward, and the king can never
   * actually be captured (see the king-safety guards in the engine layer).
   */
  const applyGhostCheckIfAny = useCallback(() => {
    const chess = chessRef.current;
    if (!isEnemyKingAttacked(chess, resolvedPlayerColor)) return;
    const reward = nextCheckGoldReward(checksDeliveredRef.current);
    checksDeliveredRef.current += 1;
    setGold((g) => g + reward);
    playSfx('gold');
    haptics.warning();
    setGhostCheckMessage(t('spell.ghostCheckMessage', { gold: reward }));
    setTimeout(() => setGhostCheckMessage(null), 1800);
  }, [resolvedPlayerColor, playSfx, haptics, t]);

  /** Shared bookkeeping after ANY move completes (normal chess.js move or a leap/céleste). */
  const finishMoveEffects = useCallback(
    (params: { moverColor: PieceColor; from: Square; to: Square; capturedType: PieceSymbol | null; isPromotion: boolean }) => {
      const chess = chessRef.current;
      const increment = (timeControl?.incrementSeconds ?? 0) * 1000;
      if (params.moverColor === 'w') setWhiteMs((ms) => ms + increment);
      else setBlackMs((ms) => ms + increment);

      setFen(chess.fen());
      setLastMove({ from: params.from, to: params.to });
      setSelectedSquare(null);
      setLegalTargets([]);
      setDrawOfferMessage(null);
      // These spell "arms" only ever last for the single move right after they're cast — once
      // that side's turn ends (whether or not the armed piece was the one moved), they expire.
      if (params.moverColor === resolvedPlayerColor) {
        setLeapArmedSquare(null);
        setCelesteArmedSquare(null);
      }

      const isMate = chess.isCheckmate();
      const isCheck = chess.inCheck();

      if (isMate) {
        playSfx('checkmate');
        haptics.error();
      } else if (isCheck) {
        playSfx('check');
        haptics.warning();
      } else if (params.capturedType) {
        playSfx('capture');
        haptics.capture();
      } else if (params.isPromotion) {
        playSfx('promote');
        haptics.success();
      } else {
        playSfx('move');
        haptics.move();
      }

      if (params.moverColor === resolvedPlayerColor) {
        let goldGained = 0;
        if (params.capturedType) goldGained += CAPTURE_GOLD_VALUE[params.capturedType];
        if (isCheck && !isMate) {
          goldGained += nextCheckGoldReward(checksDeliveredRef.current);
          checksDeliveredRef.current += 1;
        }
        if (goldGained > 0) {
          setGold((g) => g + goldGained);
          playSfx('gold');
        }
        // Résurrection: if the armed piece is the one that just captured, revive a random dead
        // ally onto the square it just departed from.
        if (resurrectionArmedSquare === params.from && params.capturedType) {
          const graveyard = deadAllyPiecesRef.current;
          if (graveyard.length > 0) {
            const idx = Math.floor(Math.random() * graveyard.length);
            const revivedType = graveyard[idx]!;
            graveyard.splice(idx, 1);
            chess.put({ type: revivedType, color: resolvedPlayerColor }, params.from);
            setFen(chess.fen());
          }
        }
        setResurrectionArmedSquare(null);
        // Shield/Entrave now guard against (or restrict) only the opponent's very next turn.
        if (shieldedSquare) {
          setShieldedSquare((current) => (current === params.from ? params.to : current));
          setShieldArmedForAiTurn(true);
        }
        if (entraveArmedSquare) setEntraveArmedForAiTurn(true);
      } else {
        // The opponent (AI) moved — its protection/restriction window is over.
        if (shieldArmedForAiTurn) {
          setShieldedSquare(null);
          setShieldArmedForAiTurn(false);
        }
        if (entraveArmedForAiTurn) {
          setEntraveArmedSquare(null);
          setEntraveArmedForAiTurn(false);
        }
        if (params.capturedType) {
          // A player piece just died — added to the Résurrection graveyard.
          deadAllyPiecesRef.current.push(params.capturedType);
        }
        let aiGoldGained = 0;
        if (params.capturedType) aiGoldGained += CAPTURE_GOLD_VALUE[params.capturedType];
        if (isCheck && !isMate) {
          aiGoldGained += nextCheckGoldReward(aiChecksDeliveredRef.current);
          aiChecksDeliveredRef.current += 1;
        }
        if (aiGoldGained > 0) {
          aiGoldRef.current += aiGoldGained;
          // The AI spends on random spells as soon as it can afford one — pure flavor, visible in
          // the opponent spell bar, but it never arms or casts any of them.
          const purchases: OwnedSpell[] = [];
          while (aiGoldRef.current > 0) {
            const affordable = SPELLS.filter((s) => s.cost <= aiGoldRef.current);
            if (affordable.length === 0) break;
            // A little restraint reads less robotic than always dumping every coin instantly.
            if (purchases.length > 0 && Math.random() < 0.3) break;
            const pick = affordable[Math.floor(Math.random() * affordable.length)]!;
            purchases.push({ instanceId: `ai-${pick.id}-${Date.now()}-${Math.random()}`, spellId: pick.id });
            aiGoldRef.current -= pick.cost;
          }
          if (purchases.length > 0) setAiOwnedSpells((prev) => [...prev, ...purchases]);
        }
      }

      if (chess.isGameOver()) {
        if (isMate) {
          finalizeGame(params.moverColor === resolvedPlayerColor ? 'win' : 'loss', 'checkmate');
        } else if (chess.isStalemate()) {
          finalizeGame('draw', 'stalemate');
        } else if (chess.isThreefoldRepetition()) {
          finalizeGame('draw', 'threefold_repetition');
        } else if (chess.isInsufficientMaterial()) {
          finalizeGame('draw', 'insufficient_material');
        } else {
          finalizeGame('draw', 'fifty_move_rule');
        }
      }
    },
    [
      timeControl,
      playSfx,
      haptics,
      finalizeGame,
      resolvedPlayerColor,
      shieldedSquare,
      shieldArmedForAiTurn,
      entraveArmedSquare,
      entraveArmedForAiTurn,
      resurrectionArmedSquare,
    ],
  );

  const applyMove = useCallback(
    (moveInput: { from: Square; to: Square; promotion?: PieceSymbol }) => {
      const chess = chessRef.current;
      let result: Move | null = null;
      try {
        result = chess.move(moveInput);
      } catch {
        return false;
      }
      if (!result) return false;

      finishMoveEffects({
        moverColor: result.color as PieceColor,
        from: result.from,
        to: result.to,
        capturedType: (result.captured as PieceSymbol | undefined) ?? null,
        isPromotion: Boolean(result.promotion),
      });
      return true;
    },
    [finishMoveEffects],
  );

  const applyLeapMoveAndAdvance = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      const chess = chessRef.current;
      const promo = promotion && promotion !== 'p' && promotion !== 'k' ? (promotion as 'q' | 'r' | 'b' | 'n') : undefined;
      const capturedBefore = chess.get(to);
      const { captured } = applyLeapMove(chess, from, to, promo);
      finishMoveEffects({
        moverColor: resolvedPlayerColor,
        from,
        to,
        capturedType: captured && capturedBefore ? capturedBefore.type : null,
        isPromotion: Boolean(promo),
      });
    },
    [finishMoveEffects, resolvedPlayerColor],
  );

  const applyCelesteMoveAndAdvance = useCallback(
    (from: Square, to: Square) => {
      const chess = chessRef.current;
      applyCelesteMove(chess, from, to);
      finishMoveEffects({ moverColor: resolvedPlayerColor, from, to, capturedType: null, isPromotion: false });
    },
    [finishMoveEffects, resolvedPlayerColor],
  );

  // AI turn
  useEffect(() => {
    const chess = chessRef.current;
    if (!opponent || finishedRef.current) return;
    if (chess.turn() === resolvedPlayerColor) return;
    if (chess.isGameOver()) return;
    // Guards against the AI move being dispatched twice for the same position (e.g. React
    // StrictMode's dev-only double-invocation of effects, or a fast re-render before the
    // resulting fen change is committed) — refs survive that double-invocation, so this check
    // is reliable where the async `cancelled` closure alone is not.
    if (aiDispatchedForFenRef.current === fen) return;
    aiDispatchedForFenRef.current = fen;

    let cancelled = false;
    setIsAiThinking(true);
    computeAiMove({
      fen: chess.fen(),
      aiDepth: opponent.aiDepth,
      aiSkillNoise: opponent.aiSkillNoise,
      style: opponent.style,
      protectedSquare: shieldArmedForAiTurn ? shieldedSquare : null,
      frozenSquare: entraveArmedForAiTurn ? entraveArmedSquare : null,
    })
      .then((response) => {
        if (cancelled || finishedRef.current) return;
        applyMove({ from: response.move.from, to: response.move.to, promotion: response.move.promotion as PieceSymbol | undefined });
      })
      .catch((error) => {
        console.error('[game] AI move failed', error);
      })
      .finally(() => {
        if (!cancelled) setIsAiThinking(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, opponent]);

  // Clocks
  useEffect(() => {
    if (isGameOver || promotionPending) return;
    const interval = setInterval(() => {
      const turn = chessRef.current.turn();
      if (turn === 'w') {
        setWhiteMs((ms) => {
          const next = ms - 1000;
          if (next <= 0 && !finishedRef.current) {
            finalizeGame(resolvedPlayerColor === 'w' ? 'loss' : 'win', 'timeout');
          }
          return Math.max(0, next);
        });
      } else {
        setBlackMs((ms) => {
          const next = ms - 1000;
          if (next <= 0 && !finishedRef.current) {
            finalizeGame(resolvedPlayerColor === 'b' ? 'loss' : 'win', 'timeout');
          }
          return Math.max(0, next);
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [finalizeGame, promotionPending, resolvedPlayerColor, isGameOver]);

  const handleSpellTargetTap = (square: Square) => {
    if (!armedSpell) return;
    const chess = chessRef.current;
    const piece = chess.get(square);

    const consumeArmedSpell = () => {
      setOwnedSpells((prev) => {
        const idx = prev.findIndex((s) => s.spellId === armedSpell);
        if (idx === -1) return prev;
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
      setArmedSpell(null);
      setSpellCastTargets([]);
    };

    /** Clears any of our own armed-square trackers that a board mutation just invalidated. */
    const invalidateStaleSquares = (affectedSquares: Square[]) => {
      if (shieldedSquare && affectedSquares.includes(shieldedSquare)) {
        setShieldedSquare(null);
        setShieldArmedForAiTurn(false);
      }
      if (leapArmedSquare && affectedSquares.includes(leapArmedSquare)) setLeapArmedSquare(null);
      if (celesteArmedSquare && affectedSquares.includes(celesteArmedSquare)) setCelesteArmedSquare(null);
      if (resurrectionArmedSquare && affectedSquares.includes(resurrectionArmedSquare)) setResurrectionArmedSquare(null);
      if (entraveArmedSquare && affectedSquares.includes(entraveArmedSquare)) {
        setEntraveArmedSquare(null);
        setEntraveArmedForAiTurn(false);
      }
    };

    if (armedSpell === 'explosion') {
      if (!piece || piece.color !== resolvedPlayerColor || piece.type !== 'p') return;
      const blastSquares = getBlastSquares(square);
      setExplosionPreviewSquares(blastSquares);
      setIsSpellResolving(true);
      consumeArmedSpell();
      setTimeout(() => {
        // Track ally deaths (for Résurrection) before the pieces are actually destroyed.
        for (const sq of blastSquares) {
          const victim = chess.get(sq);
          if (victim && victim.type !== 'k' && victim.color === resolvedPlayerColor) {
            deadAllyPiecesRef.current.push(victim.type);
          }
        }
        const { destroyedSquares } = applyExplosion(chess, square);
        invalidateStaleSquares(destroyedSquares);
        setExplosionPreviewSquares([]);
        setIsSpellResolving(false);
        setFen(chess.fen());
        playSfx('spellExplosion');
        haptics.capture();
        applyGhostCheckIfAny();
        checkForSpellInducedGameOver();
      }, 450);
      return;
    }

    if (armedSpell === 'teleport') {
      if (!piece || piece.color !== resolvedPlayerColor || piece.type === 'k') return;
      if (spellCastTargets.length === 0) {
        setSpellCastTargets([square]);
        return;
      }
      const first = spellCastTargets[0]!;
      if (first === square) return;
      applyTeleport(chess, first, square);
      if (shieldedSquare === first) setShieldedSquare(square);
      else if (shieldedSquare === square) setShieldedSquare(first);
      if (leapArmedSquare === first) setLeapArmedSquare(square);
      else if (leapArmedSquare === square) setLeapArmedSquare(first);
      if (celesteArmedSquare === first) setCelesteArmedSquare(square);
      else if (celesteArmedSquare === square) setCelesteArmedSquare(first);
      if (resurrectionArmedSquare === first) setResurrectionArmedSquare(square);
      else if (resurrectionArmedSquare === square) setResurrectionArmedSquare(first);
      consumeArmedSpell();
      setFen(chess.fen());
      playSfx('spellTeleport');
      haptics.success();
      applyGhostCheckIfAny();
      checkForSpellInducedGameOver();
      return;
    }

    if (armedSpell === 'shield') {
      if (!piece || piece.color !== resolvedPlayerColor || piece.type === 'k') return;
      setShieldedSquare(square);
      consumeArmedSpell();
      playSfx('spellShield');
      haptics.success();
      return;
    }

    if (armedSpell === 'leap') {
      if (!piece || piece.color !== resolvedPlayerColor || piece.type === 'k') return;
      setLeapArmedSquare(square);
      consumeArmedSpell();
      playSfx('spellLeap');
      haptics.success();
      return;
    }

    if (armedSpell === 'celeste') {
      if (!piece || piece.color !== resolvedPlayerColor || piece.type === 'k') return;
      setCelesteArmedSquare(square);
      consumeArmedSpell();
      playSfx('spellLeap');
      haptics.success();
      return;
    }

    if (armedSpell === 'resurrection') {
      if (!piece || piece.color !== resolvedPlayerColor || piece.type === 'k') return;
      setResurrectionArmedSquare(square);
      consumeArmedSpell();
      playSfx('spellShield');
      haptics.success();
      return;
    }

    if (armedSpell === 'entrave') {
      if (!piece || piece.color !== opponentColor || piece.type === 'k') return;
      if (!chess.isAttacked(square, resolvedPlayerColor)) return;
      setEntraveArmedSquare(square);
      consumeArmedSpell();
      playSfx('spellShield');
      haptics.success();
      return;
    }

    if (armedSpell === 'corruption') {
      if (!piece || piece.color !== opponentColor || piece.type === 'k') return;
      const isAdjacentToAlly = getOrthogonalAdjacentSquares(square).some((sq) => chess.get(sq)?.color === resolvedPlayerColor);
      if (!isAdjacentToAlly) return;
      applyCorruption(chess, square, resolvedPlayerColor);
      invalidateStaleSquares([square]);
      consumeArmedSpell();
      setFen(chess.fen());
      playSfx('spellTeleport');
      haptics.success();
      applyGhostCheckIfAny();
      checkForSpellInducedGameOver();
    }
  };

  const handleSquareTap = (square: Square) => {
    if (!isPlayerTurn) return;
    if (armedSpell) {
      handleSpellTargetTap(square);
      return;
    }
    const chess = chessRef.current;
    const piece = chess.get(square);

    if (selectedSquare && legalTargets.includes(square)) {
      const movingPiece = chess.get(selectedSquare);
      const isLeapMove = selectedSquare === leapArmedSquare;
      const isCelesteMove = selectedSquare === celesteArmedSquare;
      const isPromotion = movingPiece?.type === 'p' && (square[1] === '8' || square[1] === '1');
      if (isPromotion) {
        setPromotionPending({ from: selectedSquare, to: square, isLeap: isLeapMove });
      } else if (isCelesteMove) {
        applyCelesteMoveAndAdvance(selectedSquare, square);
      } else if (isLeapMove) {
        applyLeapMoveAndAdvance(selectedSquare, square);
      } else {
        applyMove({ from: selectedSquare, to: square });
      }
      return;
    }

    if (piece && piece.color === resolvedPlayerColor) {
      setSelectedSquare(square);
      setLegalTargets(
        square === leapArmedSquare
          ? getLeapDestinations(chess, square)
          : square === celesteArmedSquare
            ? getCelesteDestinations(chess, square)
            : chess.moves({ square, verbose: true }).map((m) => m.to),
      );
      return;
    }

    setSelectedSquare(null);
    setLegalTargets([]);
  };

  const handlePieceDrop = (from: Square, to: Square) => {
    if (!isPlayerTurn || armedSpell) return;
    const chess = chessRef.current;
    const piece = chess.get(from);
    if (!piece || piece.color !== resolvedPlayerColor) return;
    const isLeapMove = from === leapArmedSquare;
    const isCelesteMove = from === celesteArmedSquare;
    const targets = isLeapMove
      ? getLeapDestinations(chess, from)
      : isCelesteMove
        ? getCelesteDestinations(chess, from)
        : chess.moves({ square: from, verbose: true }).map((m) => m.to);
    if (!targets.includes(to)) {
      setSelectedSquare(null);
      setLegalTargets([]);
      return;
    }
    const isPromotion = piece.type === 'p' && (to[1] === '8' || to[1] === '1');
    if (isPromotion) {
      setPromotionPending({ from, to, isLeap: isLeapMove });
    } else if (isCelesteMove) {
      applyCelesteMoveAndAdvance(from, to);
    } else if (isLeapMove) {
      applyLeapMoveAndAdvance(from, to);
    } else {
      applyMove({ from, to });
    }
  };

  const handlePromotionSelect = (piece: PieceSymbol) => {
    if (!promotionPending) return;
    if (promotionPending.isLeap) {
      applyLeapMoveAndAdvance(promotionPending.from, promotionPending.to, piece);
    } else {
      applyMove({ from: promotionPending.from, to: promotionPending.to, promotion: piece });
    }
    setPromotionPending(null);
  };

  const handleResign = () => {
    if (settings.confirmBeforeResign) {
      setResignConfirmVisible(true);
    } else {
      finalizeGame('loss', 'resignation');
    }
  };

  const handleOfferDraw = () => {
    if (!opponent || isGameOver) return;
    setDrawOfferMessage(t('game.drawOfferSent'));
    const decisionDelay = 1200 + Math.random() * 1300;
    setTimeout(() => {
      if (finishedRef.current) return;
      if (opponentAcceptsDraw(chessRef.current)) {
        setDrawOfferMessage(t('game.drawAccepted', { name: opponent.username }));
        finalizeGame('draw', 'draw_agreement');
      } else {
        setDrawOfferMessage(t('game.drawDeclined', { name: opponent.username }));
        setTimeout(() => setDrawOfferMessage(null), 2200);
      }
    }, decisionDelay);
  };

  const handleBuySpell = (spellId: SpellId) => {
    const def = getSpellDef(spellId);
    if (gold < def.cost) return;
    setGold((g) => g - def.cost);
    setOwnedSpells((prev) => [...prev, { instanceId: `${spellId}-${Date.now()}-${Math.random()}`, spellId }]);
    playSfx('spellBuy');
    haptics.success();
  };

  const handleArmSpell = (spellId: SpellId) => {
    if (!isPlayerTurn) return;
    if (armedSpell === spellId) {
      setArmedSpell(null);
      setSpellCastTargets([]);
      return;
    }
    setArmedSpell(spellId);
    setSpellCastTargets([]);
    setSelectedSquare(null);
    setLegalTargets([]);
  };

  const handleSendChat = (text: string) => {
    setChatMessages((prev) => [...prev, { id: `chat-${Date.now()}-${Math.random()}`, from: 'player', text }]);
  };

  const handleQuit = () => {
    clearMatch();
    router.replace('/home');
  };

  const handleViewResult = () => {
    router.replace('/result');
  };

  const windowWidth = Dimensions.get('window').width;
  const sidePanelWidth = windowWidth < 500 ? 84 : 116;
  const boardSize = useMemo(() => {
    const rowGap = spacing.xs * 2;
    const available = windowWidth - spacing.md * 2 - sidePanelWidth * 2 - rowGap;
    return Math.max(140, Math.min(available, 420));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!opponent) return null;

  const topColor: PieceColor = orientation === 'white' ? 'b' : 'w';
  const bottomColor: PieceColor = orientation === 'white' ? 'w' : 'b';
  const topIsOpponent = topColor !== resolvedPlayerColor;

  const gameOverReasonLabel = pendingGameOver
    ? pendingGameOver.endReason === 'checkmate'
      ? t(pendingGameOver.result === 'win' ? 'game.gameOverCheckmateWin' : 'game.gameOverCheckmateLoss')
      : pendingGameOver.endReason === 'resignation'
        ? t('game.gameOverResignation')
        : pendingGameOver.endReason === 'timeout'
          ? t('game.gameOverTimeout')
          : t('game.gameOverDraw')
    : '';

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <PlayerBar
          isOpponent={topIsOpponent}
          opponent={opponent}
          profile={profile}
          color={topColor}
          clockMs={topColor === 'w' ? whiteMs : blackMs}
          active={derivedChess.turn() === topColor}
        />

        <View style={styles.middleRow}>
          <LeftGamePanel
            width={sidePanelWidth}
            messages={chatMessages}
            onSend={handleSendChat}
            musicEnabled={settings.musicEnabled}
            musicVolume={settings.musicVolume}
            onToggleMusic={(v) => updateSettings({ musicEnabled: v })}
            onChangeVolume={(v) => {
              updateSettings({ musicVolume: v });
              setMusicVolume(v);
            }}
          />

          <View style={styles.center}>
            {ghostCheckMessage && <Text style={styles.ghostCheckBanner}>{ghostCheckMessage}</Text>}
            {derivedChess.inCheck() && !isGameOver && <Text style={styles.checkBanner}>{t('game.check')}</Text>}
            {isAiThinking && (
              <Text style={styles.statusText}>{t('game.opponentTurn', { name: opponent.username })}</Text>
            )}
            {armedSpell && (
              <Text style={styles.statusText}>
                {armedSpell === 'explosion' && t('spell.chooseTargetPawn')}
                {armedSpell === 'teleport' && (spellCastTargets.length === 0 ? t('spell.chooseFirstAlly') : t('spell.chooseSecondAlly'))}
                {(armedSpell === 'entrave' || armedSpell === 'corruption') && t('spell.chooseEnemyTarget')}
                {(armedSpell === 'shield' || armedSpell === 'leap' || armedSpell === 'celeste' || armedSpell === 'resurrection') &&
                  t('spell.chooseAllyTarget')}
              </Text>
            )}
            {drawOfferMessage && <Text style={styles.statusText}>{drawOfferMessage}</Text>}

            <ZoomableBoard size={boardSize}>
              <ChessBoard
                fen={fen}
                orientation={orientation}
                size={boardSize}
                boardTheme={boardTheme}
                pieceTheme={pieceTheme}
                selectedSquare={armedSpell ? (spellCastTargets[0] ?? null) : selectedSquare}
                legalTargets={armedSpell ? spellHighlightTargets : legalTargets}
                lastMove={lastMove}
                checkSquare={checkSquare}
                dangerSquares={explosionPreviewSquares}
                interactive={isPlayerTurn}
                onSquareTap={handleSquareTap}
                onPieceDrop={handlePieceDrop}
              />
            </ZoomableBoard>

            {armedSpell && (
              <Pressable onPress={() => handleArmSpell(armedSpell)} style={styles.cancelSpellButton}>
                <Text style={styles.cancelSpellLabel}>✕ {t('spell.cancelCast')}</Text>
              </Pressable>
            )}
          </View>

          <RightSpellPanel
            width={sidePanelWidth}
            gold={gold}
            ownedSpells={ownedSpells}
            aiOwnedSpells={aiOwnedSpells}
            armedSpell={armedSpell}
            onArm={handleArmSpell}
            onBuy={handleBuySpell}
          />
        </View>

        <PlayerBar
          isOpponent={!topIsOpponent}
          opponent={opponent}
          profile={profile}
          color={bottomColor}
          clockMs={bottomColor === 'w' ? whiteMs : blackMs}
          active={derivedChess.turn() === bottomColor}
        />

        <View style={styles.actionsRow}>
          <ActionButton label={t('game.flipBoard')} icon="⇅" onPress={() => setFlipped((f) => !f)} />
          <ActionButton label={t('game.offerDraw')} icon="🤝" onPress={handleOfferDraw} disabled={isGameOver} />
          <ActionButton label={t('game.resign')} icon="🏳" onPress={handleResign} danger disabled={isGameOver} />
        </View>
      </SafeAreaView>

      <PromotionModal
        visible={promotionPending !== null}
        color={resolvedPlayerColor}
        pieceTheme={pieceTheme}
        onSelect={handlePromotionSelect}
      />

      <ConfirmModal
        visible={resignConfirmVisible}
        title={t('game.resignConfirmTitle')}
        body={t('game.resignConfirmBody')}
        confirmLabel={t('game.resign')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          setResignConfirmVisible(false);
          finalizeGame('loss', 'resignation');
        }}
        onCancel={() => setResignConfirmVisible(false)}
      />

      <GameOverPanel
        visible={pendingGameOver !== null}
        result={pendingGameOver?.result ?? 'draw'}
        reasonLabel={gameOverReasonLabel}
        viewResultLabel={t('game.viewResult')}
        quitLabel={t('game.quit')}
        onViewResult={handleViewResult}
        onQuit={handleQuit}
      />
    </View>
  );
}

function PlayerBar({
  isOpponent,
  opponent,
  profile,
  color,
  clockMs,
  active,
}: {
  isOpponent: boolean;
  opponent: OpponentProfile;
  profile: PlayerProfile;
  color: PieceColor;
  clockMs: number;
  active: boolean;
}) {
  return (
    <View style={styles.playerBar}>
      <View style={styles.playerInfo}>
        <Avatar avatar={isOpponent ? opponent.avatar : profile.avatar} size={36} />
        <Text style={styles.playerName} numberOfLines={1}>
          {isOpponent ? opponent.username : profile.username}
        </Text>
        <Text style={styles.playerColorDot}>{color === 'w' ? '♔' : '♚'}</Text>
      </View>
      <View style={[styles.clock, active && styles.clockActive]}>
        <Text style={[styles.clockText, active && styles.clockTextActive]}>{formatClock(clockMs)}</Text>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  danger,
  disabled,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.actionButton, pressed && !disabled && styles.actionButtonPressed, disabled && styles.actionButtonDisabled]}
    >
      <Text style={[styles.actionIcon, danger && !disabled && { color: palette.danger }]}>{icon}</Text>
      <Text style={styles.actionLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
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
    gap: spacing.sm,
  },
  middleRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  checkBanner: {
    color: palette.danger,
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
  },
  ghostCheckBanner: {
    color: palette.goldBright,
    fontFamily: fontFamily.display,
    fontSize: fontSize.md,
  },
  statusText: {
    color: palette.ivoryMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  cancelSpellButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  cancelSpellLabel: {
    color: palette.danger,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.stonePanel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  playerName: {
    color: palette.ivory,
    fontWeight: '600',
    flexShrink: 1,
  },
  playerColorDot: {
    color: palette.ivoryFaint,
    fontSize: fontSize.sm,
  },
  clock: {
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    minWidth: 64,
    alignItems: 'center',
  },
  clockActive: {
    backgroundColor: palette.gold,
  },
  clockText: {
    color: palette.ivory,
    fontFamily: fontFamily.mono,
    fontWeight: '700',
  },
  clockTextActive: {
    color: palette.voidBlack,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 80,
  },
  actionButtonPressed: {
    opacity: 0.6,
  },
  actionButtonDisabled: {
    opacity: 0.35,
  },
  actionIcon: {
    fontSize: 22,
    color: palette.ivoryMuted,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    color: palette.ivoryFaint,
  },
});
