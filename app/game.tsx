import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  nextMatchTrack,
  pauseMatchMusic,
  previousMatchTrack,
  resumeMatchMusic,
  setMusicVolume,
  useMatchMusicStatus,
} from '@/audio/sounds';
import { Avatar } from '@/components/Avatar';
import { CapturedPieces } from '@/components/CapturedPieces';
import { ChessBoard } from '@/components/ChessBoard';
import { ConfirmModal } from '@/components/ConfirmModal';
import { GameOverPanel } from '@/components/GameOverPanel';
import { LeftGamePanel, type ChatEntry } from '@/components/LeftGamePanel';
import { PromotionModal } from '@/components/PromotionModal';
import { RightSpellPanel } from '@/components/RightSpellPanel';
import { computeAiMove } from '@/engine/aiPlayer';
import { findKingSquare, getMissingPieces, isEnemyKingAttacked } from '@/engine/boardUtils';
import { applyCelesteMove, getCelesteDestinations } from '@/engine/celesteMoves';
import { evaluatePosition } from '@/engine/evaluation';
import { applyLeapMove, getLeapDestinations } from '@/engine/leapMoves';
import {
  applyCorruption,
  applyEchoOfThePast,
  applyExplosion,
  applyTeleport,
  applyTeleportWithPromotion,
  getBlastSquares,
  getOrthogonalAdjacentSquares,
  getTeleportPromotionSquare,
  hasLineOfSight,
  promoteEdgePawns,
  resolveDestructionReactions,
  wouldTeleportStrandPawn,
  type DestructionReactionState,
} from '@/engine/spellEffects';
import { evaluateAchievements } from '@/domain/achievementRules';
import { getBoardTheme, getPieceTheme } from '@/domain/cosmetics';
import { getDivisionById } from '@/domain/divisions';
import { CAPTURE_GOLD_VALUE, MAX_OWNED_SPELLS, SPELLS, getSpellDef, nextCheckGoldReward, type OwnedSpell, type SpellId } from '@/domain/spells';
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

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

/** Standard whole-number material values (chess.com-style), for the captured-pieces display only. */
const STANDARD_PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

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
  const isUntimed = useMatchStore((s) => s.isUntimed);
  const playerColor = useMatchStore((s) => s.playerColor);
  const setLastResult = useMatchStore((s) => s.setLastResult);
  const clearMatch = useMatchStore((s) => s.clearMatch);

  const profile = useProfileStore((s) => s.profile);
  const applyGameResult = useProfileStore((s) => s.applyGameResult);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);
  const unlockAchievements = useRewardsStore((s) => s.unlockMany);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const musicStatus = useMatchMusicStatus();

  const boardTheme = getBoardTheme(profile.activeBoardTheme);
  const pieceTheme = getPieceTheme(profile.activePieceTheme);

  const chessRef = useRef(new Chess());
  const startedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const aiDispatchedForFenRef = useRef<string | null>(null);
  // How many of `opponent.scriptedOpeningMoves` (Gartin's fixed knight shuffle) have been played.
  const scriptedMoveIndexRef = useRef(0);
  const checksDeliveredRef = useRef(0);
  const aiChecksDeliveredRef = useRef(0);
  const deadAllyPiecesRef = useRef<PieceSymbol[]>([]);
  // Spells that mutate the board directly (chess.put/remove for Cataclysme, Téléportation,
  // Corruption, Résurrection) desync chess.js's own undo/redo stack from the live board, which
  // makes chess.history()/chess.pgn() crash at game end (both replay the whole game backward then
  // forward to rebuild it). We track moves ourselves instead of ever relying on chess.history().
  const moveLogRef = useRef<{ moverColor: PieceColor; piece: PieceSymbol; isPromotion: boolean }[]>([]);
  // "Réflexion": the last spell any side successfully cast, for copying. Since the AI never casts
  // (see aiOwnedSpells below), `casterColor` here is always the player's — Réflexion can never
  // find an opponent-cast spell to copy today; kept generic for a future spell-casting opponent.
  const lastCastSpellRef = useRef<{ casterColor: PieceColor; spellId: SpellId; targets: Square[] } | null>(null);

  const [fen, setFen] = useState(() => new Chess().fen());
  const derivedChess = useMemo(() => new Chess(fen), [fen]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [promotionPending, setPromotionPending] = useState<{
    from: Square;
    to: Square;
    isLeap: boolean;
    isTeleport?: boolean;
  } | null>(null);
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
  // "Un seul sort par tour": true as soon as any spell is cast, reset when the player's turn comes
  // back around.
  const [hasCastSpellThisTurn, setHasCastSpellThisTurn] = useState(false);
  // Transient feedback for spell-related failures (turn limit, Réflexion with nothing to copy…).
  const [spellFeedbackMessage, setSpellFeedbackMessage] = useState<string | null>(null);
  // Piège Invisible: the first piece (any color) to land here is destroyed.
  const [trapSquares, setTrapSquares] = useState<Square[]>([]);
  // Chasseur de Prime: if the marked piece dies (by any means), `bountyMarkedByColor` steals all
  // of the opposing side's gold. Persists until the piece dies — no one-turn expiry.
  const [bountyMarkedSquare, setBountyMarkedSquare] = useState<Square | null>(null);
  const [bountyMarkedByColor, setBountyMarkedByColor] = useState<PieceColor | null>(null);
  // Liaison Funeste: if either square's piece dies, the other's piece dies too.
  const [boundPair, setBoundPair] = useState<[Square, Square] | null>(null);
  // Camouflage: fools the AI's next-turn evaluation into scoring the player's pieces as pawns.
  const [camouflageArmedForAiTurn, setCamouflageArmedForAiTurn] = useState(false);
  // Silencium: blocks the targeted color from casting any spell during its next turn.
  const [silencedColor, setSilencedColor] = useState<PieceColor | null>(null);
  const [silencedArmedForAiTurn, setSilencedArmedForAiTurn] = useState(false);
  // "Écho du Passé": the square a piece occupied right before its last normal/leap/céleste move.
  // Raw-mutation spells (Téléportation, Corruption) intentionally don't update this — a piece
  // moved only by those simply isn't a valid Écho du Passé target yet. State (not a ref) because
  // it's read during render, inside `spellHighlightTargets` below.
  const [previousSquareMap, setPreviousSquareMap] = useState<Partial<Record<Square, Square>>>({});

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

  // Readable log of what's happened in the match — every move (in SAN when it went through
  // chess.js normally, a simple square-arrow fallback for leap/céleste's raw mutations) and every
  // spell cast, in order.
  const [gameLog, setGameLog] = useState<{ id: string; text: string }[]>([]);
  const pushLog = useCallback((text: string) => {
    setGameLog((prev) => {
      const next = [...prev, { id: `log-${Date.now()}-${Math.random()}`, text }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);
  // Only ever called for the player's own casts — the AI never arms or casts a spell (see
  // lastCastSpellRef's docs elsewhere in this file).
  const logSpellCast = useCallback(
    (spellId: SpellId, targets: Square[]) => {
      const spellName = t(getSpellDef(spellId).nameKey);
      const text =
        targets.length === 0
          ? t('game.logSpellCast', { name: profile.username, spell: spellName })
          : targets.length === 1
            ? t('game.logSpellCastOn', { name: profile.username, spell: spellName, square: targets[0] })
            : t('game.logSpellCastBetween', { name: profile.username, spell: spellName, squareA: targets[0], squareB: targets[1] });
      pushLog(text);
    },
    [t, profile.username, pushLog],
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
      chess.header('Event', 'Wizard Chess', 'White', whiteName, 'Black', blackName, 'Date', new Date().toISOString().slice(0, 10));
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

  // Captured-pieces display (chess.com-style): each side's bar shows what *that side* has
  // captured — i.e. the other color's missing pieces — plus a material-lead badge for whoever's
  // ahead. Derived fresh from the board every render; see `getMissingPieces`'s own docs for why.
  // Uses the standard whole-number chess values (1/3/3/5/9), not the search engine's centipawn
  // table (`PIECE_VALUES`) — that one's tuned for evaluation (knight 320, bishop 330) and dividing
  // it down for display both looks unfamiliar and, being non-round to begin with, surfaces raw
  // binary floating-point artifacts like "+2.9000000000000004".
  const whiteMissing = useMemo(() => getMissingPieces(derivedChess, 'w'), [derivedChess]);
  const blackMissing = useMemo(() => getMissingPieces(derivedChess, 'b'), [derivedChess]);
  const materialLost = (missing: PieceSymbol[]) => missing.reduce((sum, type) => sum + STANDARD_PIECE_VALUE[type], 0);
  const whiteAdvantage = Math.max(0, materialLost(blackMissing) - materialLost(whiteMissing));
  const blackAdvantage = Math.max(0, materialLost(whiteMissing) - materialLost(blackMissing));

  // Squares highlighted while a spell is armed, replacing normal move highlighting. Most spells
  // target an allied non-king piece; Entrave/Corruption/Chasseur de Prime instead target an enemy
  // piece meeting their own condition; Piège Invisible targets an empty square; Écho du Passé
  // targets any piece whose tracked previous square is currently vacant; Liaison Funeste targets
  // an ally then an enemy in clear line of sight of it.
  const spellHighlightTargets = useMemo(() => {
    if (!armedSpell) return [];
    const squares: Square[] = [];
    const board = derivedChess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r]![f];
        const square = `${FILES[f]}${8 - r}` as Square;

        if (armedSpell === 'piege_invisible') {
          if (!cell && !trapSquares.includes(square)) squares.push(square);
          continue;
        }
        if (!cell) continue;

        if (armedSpell === 'explosion') {
          if (cell.color === resolvedPlayerColor && cell.type === 'p') squares.push(square);
          continue;
        }
        if (armedSpell === 'entrave') {
          if (cell.color === opponentColor && cell.type !== 'k' && derivedChess.isAttacked(square, resolvedPlayerColor)) {
            squares.push(square);
          }
          continue;
        }
        if (armedSpell === 'corruption') {
          if (
            cell.color === opponentColor &&
            cell.type !== 'k' &&
            getOrthogonalAdjacentSquares(square).some((sq) => derivedChess.get(sq)?.color === resolvedPlayerColor)
          ) {
            squares.push(square);
          }
          continue;
        }
        if (armedSpell === 'chasseur_de_prime') {
          if (cell.color === opponentColor && cell.type !== 'k') squares.push(square);
          continue;
        }
        if (armedSpell === 'echo_du_passe') {
          const previous = previousSquareMap[square];
          if (cell.type !== 'k' && previous && !derivedChess.get(previous)) squares.push(square);
          continue;
        }
        if (armedSpell === 'liaison_funeste') {
          if (spellCastTargets.length === 0) {
            if (cell.color === resolvedPlayerColor && cell.type !== 'k') squares.push(square);
          } else if (cell.color === opponentColor && cell.type !== 'k' && hasLineOfSight(derivedChess, spellCastTargets[0]!, square)) {
            squares.push(square);
          }
          continue;
        }
        // prix_du_sang / teleport / shield / leap / celeste / resurrection: own non-king pieces.
        if (cell.color === resolvedPlayerColor && cell.type !== 'k' && !spellCastTargets.includes(square)) {
          squares.push(square);
        }
      }
    }
    return squares;
  }, [armedSpell, derivedChess, resolvedPlayerColor, opponentColor, spellCastTargets, previousSquareMap, trapSquares]);

  const finalizeGame = useCallback(
    (result: GameResultKind, endReason: GameEndReason) => {
      if (finishedRef.current || !opponent) return;
      finishedRef.current = true;
      setIsGameOver(true);
      setArmedSpell(null);
      setSpellCastTargets([]);

      const chess = chessRef.current;
      // Never call chess.history()/chess.pgn() here without a fallback: any spell that mutated the
      // board directly (Cataclysme, Téléportation, Corruption, Résurrection) desyncs chess.js's own
      // undo/redo stack from the live board, and both of those replay the whole game backward then
      // forward to rebuild themselves — so we read move info from our own tracked log instead.
      const moveHistory = moveLogRef.current;
      const moveCount = moveHistory.length;
      const didPromotePawn = moveHistory.some((m) => m.isPromotion);
      const lastMoveEntry = moveHistory[moveHistory.length - 1];
      const checkmateDeliveredByKnight =
        result === 'win' && endReason === 'checkmate' && lastMoveEntry?.piece === 'n' && lastMoveEntry.moverColor === resolvedPlayerColor;
      let pgn = '';
      try {
        pgn = chess.pgn();
      } catch {
        // See the comment above — falls back to no PGN rather than crashing the game-over flow.
      }

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
        pgn,
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
        pgn,
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

  /**
   * Given squares already cleared of a piece (by explosion, a normal capture, Prix du Sang, a
   * Piège Invisible trigger…), resolves the cross-spell "reacts to a death" mechanisms — Chasseur
   * de Prime's gold theft and Liaison Funeste's chained kill — via the pure
   * `resolveDestructionReactions` helper, then applies the result (extra removals, gold, clearing
   * consumed trackers) to this match's live state. Returns the extra squares it destroyed, so the
   * caller can also invalidate any of its own trackers pointing at them.
   *
   * `overrideState` lets a caller that just remapped trap/bounty/boundPair squares (in the same
   * synchronous block, e.g. a piece moving onto the trap square) pass the *already-remapped*
   * values instead of the stale ones still sitting in React state until the next render.
   */
  const reactToDestruction = useCallback(
    (destroyedSquares: Square[], overrideState?: DestructionReactionState): Square[] => {
      const chess = chessRef.current;
      const state: DestructionReactionState = overrideState ?? {
        trapSquares,
        bountyMarkedSquare,
        bountyMarkedByColor,
        boundPair,
      };
      const reaction = resolveDestructionReactions(destroyedSquares, state);
      for (const sq of reaction.extraDestroyedSquares) {
        const victim = chess.get(sq);
        // A king can never be removed by magic, full stop — not even as a chained Liaison Funeste
        // reaction. `boundPair`/`bountyMarkedSquare` are tracked purely by square and only ever
        // get *bound* to a non-king piece at cast time, but by the time this cascade fires (any
        // number of moves later) that square could, entirely through normal legal play, have come
        // to hold a king (its original occupant moved or was captured elsewhere without ever
        // clearing the stale tracker). This is the actual safety check, independent of that.
        if (!victim || victim.type === 'k') continue;
        if (victim.color === resolvedPlayerColor) deadAllyPiecesRef.current.push(victim.type);
        chess.remove(sq);
      }
      if (reaction.goldStolenBy === resolvedPlayerColor) {
        setGold((g) => g + aiGoldRef.current);
        aiGoldRef.current = 0;
        playSfx('gold');
      } else if (reaction.goldStolenBy === opponentColor) {
        aiGoldRef.current += gold;
        setGold(0);
      }
      if (reaction.consumedTrapSquares.length > 0) {
        setTrapSquares((prev) => prev.filter((sq) => !reaction.consumedTrapSquares.includes(sq)));
      }
      if (reaction.bountyConsumed) {
        setBountyMarkedSquare(null);
        setBountyMarkedByColor(null);
      }
      if (reaction.boundPairConsumed) setBoundPair(null);
      return reaction.extraDestroyedSquares;
    },
    [trapSquares, bountyMarkedSquare, bountyMarkedByColor, boundPair, resolvedPlayerColor, opponentColor, gold, playSfx],
  );

  /** Clears any of our own armed-square trackers that a board mutation just invalidated. */
  const invalidateStaleSquares = useCallback(
    (affectedSquares: Square[]) => {
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
    },
    [shieldedSquare, leapArmedSquare, celesteArmedSquare, resurrectionArmedSquare, entraveArmedSquare],
  );

  /** Piège Invisible: destroys whatever just landed on any currently-armed trap square (several
   * traps can be active at once — only the ones actually landed on this call are consumed). */
  const triggerTrapIfLanded = useCallback(
    (landedSquares: Square[], overrideState?: DestructionReactionState) => {
      const state: DestructionReactionState = overrideState ?? { trapSquares, bountyMarkedSquare, bountyMarkedByColor, boundPair };
      const hitSquares = landedSquares.filter((sq) => state.trapSquares.includes(sq));
      if (hitSquares.length === 0) return;
      const chess = chessRef.current;
      const destroyed: Square[] = [];
      for (const sq of hitSquares) {
        const victim = chess.get(sq);
        if (!victim || victim.type === 'k') continue;
        if (victim.color === resolvedPlayerColor) deadAllyPiecesRef.current.push(victim.type);
        chess.remove(sq);
        destroyed.push(sq);
      }
      if (destroyed.length === 0) return;
      const extra = reactToDestruction(destroyed, state);
      invalidateStaleSquares([...destroyed, ...extra]);
      playSfx('spellExplosion');
    },
    [trapSquares, bountyMarkedSquare, bountyMarkedByColor, boundPair, resolvedPlayerColor, reactToDestruction, invalidateStaleSquares, playSfx],
  );

  /** Shared bookkeeping after ANY move completes (normal chess.js move or a leap/céleste). */
  const finishMoveEffects = useCallback(
    (params: {
      moverColor: PieceColor;
      piece: PieceSymbol;
      from: Square;
      to: Square;
      capturedType: PieceSymbol | null;
      isPromotion: boolean;
      /** SAN when available (normal chess.js moves); leap/céleste supply their own simple fallback. */
      notation: string;
    }) => {
      const chess = chessRef.current;
      moveLogRef.current.push({ moverColor: params.moverColor, piece: params.piece, isPromotion: params.isPromotion });
      setPreviousSquareMap((prev) => ({ ...prev, [params.to]: params.from }));
      const moverName = params.moverColor === resolvedPlayerColor ? profile.username : (opponent?.username ?? '');
      pushLog(t('game.logMove', { name: moverName, notation: params.notation }));
      const increment = (timeControl?.incrementSeconds ?? 0) * 1000;
      if (params.moverColor === 'w') setWhiteMs((ms) => ms + increment);
      else setBlackMs((ms) => ms + increment);

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

      // Chasseur de Prime / Liaison Funeste: whichever side moved, remap any tracker pointing at
      // the vacated square onto the piece's new one. Computed locally (not via the stale state
      // still in `bountyMarkedSquare`/`boundPair` until next render) so the trap check right below
      // sees the piece's *current* square, not last render's. Wrapped defensively: a failure here
      // must never leave the board permanently unresponsive for either player.
      try {
        const remappedBounty = bountyMarkedSquare === params.from ? params.to : bountyMarkedSquare;
        const remappedBoundPair: [Square, Square] | null = boundPair
          ? [
              boundPair[0] === params.from ? params.to : boundPair[0],
              boundPair[1] === params.from ? params.to : boundPair[1],
            ]
          : null;
        if (remappedBounty !== bountyMarkedSquare) setBountyMarkedSquare(remappedBounty);
        if (remappedBoundPair !== boundPair) setBoundPair(remappedBoundPair);
        triggerTrapIfLanded([params.to], { trapSquares, bountyMarkedSquare: remappedBounty, bountyMarkedByColor, boundPair: remappedBoundPair });
      } catch (error) {
        console.error('[game] post-move spell reaction failed', error);
      }
      // Only now — after the trap (and any chained reaction) has possibly removed a piece —
      // do we sync `fen` state to the board, so the rendered board reflects the *final* position
      // in one go instead of briefly showing the piece that's about to vanish as still there.
      setFen(chess.fen());

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
            promoteEdgePawns(chess, [params.from]);
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
        if (camouflageArmedForAiTurn) setCamouflageArmedForAiTurn(false);
        if (silencedArmedForAiTurn) {
          setSilencedColor(null);
          setSilencedArmedForAiTurn(false);
        }
        // It's the player's turn again — the one-spell-per-turn limit resets, and any spell
        // bought last turn is now old enough to cast.
        setHasCastSpellThisTurn(false);
        setOwnedSpells((prev) => prev.map((s) => (s.boughtThisTurn ? { ...s, boughtThisTurn: false } : s)));
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
          // the opponent spell bar, but it never arms or casts any of them. Spell-less adventure
          // bosses (usesSpells: false) skip this entirely — they never own a single spell.
          if (opponent?.usesSpells !== false) {
            const purchases: OwnedSpell[] = [];
            while (aiGoldRef.current > 0) {
              const affordable = SPELLS.filter((s) => s.cost <= aiGoldRef.current);
              if (affordable.length === 0) break;
              // A little restraint reads less robotic than always dumping every coin instantly.
              if (purchases.length > 0 && Math.random() < 0.3) break;
              const pick = affordable[Math.floor(Math.random() * affordable.length)]!;
              purchases.push({ instanceId: `ai-${pick.id}-${Date.now()}-${Math.random()}`, spellId: pick.id, boughtThisTurn: false });
              aiGoldRef.current -= pick.cost;
            }
            if (purchases.length > 0) setAiOwnedSpells((prev) => [...prev, ...purchases]);
          }
        }
      }

      // Chasseur de Prime / Liaison Funeste: a normal capture (either side) can also chain-react
      // (e.g. the captured piece was bound to another one elsewhere on the board).
      if (params.capturedType) {
        try {
          const extra = reactToDestruction([params.to]);
          if (extra.length > 0) invalidateStaleSquares(extra);
        } catch (error) {
          console.error('[game] post-capture spell reaction failed', error);
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
      opponent,
      profile.username,
      pushLog,
      t,
      shieldedSquare,
      shieldArmedForAiTurn,
      entraveArmedSquare,
      entraveArmedForAiTurn,
      resurrectionArmedSquare,
      bountyMarkedSquare,
      bountyMarkedByColor,
      boundPair,
      trapSquares,
      camouflageArmedForAiTurn,
      silencedArmedForAiTurn,
      triggerTrapIfLanded,
      reactToDestruction,
      invalidateStaleSquares,
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
        piece: result.piece as PieceSymbol,
        from: result.from,
        to: result.to,
        capturedType: (result.captured as PieceSymbol | undefined) ?? null,
        isPromotion: Boolean(result.promotion),
        notation: result.san,
      });
      return true;
    },
    [finishMoveEffects],
  );

  const applyLeapMoveAndAdvance = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      const chess = chessRef.current;
      const promo = promotion && promotion !== 'p' && promotion !== 'k' ? (promotion as 'q' | 'r' | 'b' | 'n') : undefined;
      const movedPiece = chess.get(from)?.type ?? 'p';
      const capturedBefore = chess.get(to);
      const { captured } = applyLeapMove(chess, from, to, promo);
      finishMoveEffects({
        moverColor: resolvedPlayerColor,
        piece: promo ?? movedPiece,
        from,
        to,
        capturedType: captured && capturedBefore ? capturedBefore.type : null,
        isPromotion: Boolean(promo),
        notation: `🐴 ${from} → ${to}`,
      });
    },
    [finishMoveEffects, resolvedPlayerColor],
  );

  const applyCelesteMoveAndAdvance = useCallback(
    (from: Square, to: Square) => {
      const chess = chessRef.current;
      const movedPiece = chess.get(from)?.type ?? 'q';
      applyCelesteMove(chess, from, to);
      finishMoveEffects({
        moverColor: resolvedPlayerColor,
        piece: movedPiece,
        from,
        to,
        capturedType: null,
        isPromotion: false,
        notation: `✨ ${from} → ${to}`,
      });
    },
    [finishMoveEffects, resolvedPlayerColor],
  );

  /**
   * Shared tail end of a Téléportation cast, run once the swap (and any promotion) has already
   * been applied to the board — remaps any of our own armed-square trackers that pointed at
   * either swapped square, consumes the spell, and re-triggers all the usual post-cast effects.
   * Split out because a teleport that promotes a pawn defers the swap itself until the player
   * picks a piece (see `handlePromotionSelect`), but needs to finish the same way either path.
   */
  const finishTeleportResolution = useCallback(
    (squareA: Square, squareB: Square) => {
      const chess = chessRef.current;
      if (shieldedSquare === squareA) setShieldedSquare(squareB);
      else if (shieldedSquare === squareB) setShieldedSquare(squareA);
      if (leapArmedSquare === squareA) setLeapArmedSquare(squareB);
      else if (leapArmedSquare === squareB) setLeapArmedSquare(squareA);
      if (celesteArmedSquare === squareA) setCelesteArmedSquare(squareB);
      else if (celesteArmedSquare === squareB) setCelesteArmedSquare(squareA);
      if (resurrectionArmedSquare === squareA) setResurrectionArmedSquare(squareB);
      else if (resurrectionArmedSquare === squareB) setResurrectionArmedSquare(squareA);
      const remap = (square: Square) => (square === squareA ? squareB : square === squareB ? squareA : square);
      const remappedBounty = bountyMarkedSquare ? remap(bountyMarkedSquare) : bountyMarkedSquare;
      const remappedBoundPair: [Square, Square] | null = boundPair ? [remap(boundPair[0]), remap(boundPair[1])] : null;
      if (remappedBounty !== bountyMarkedSquare) setBountyMarkedSquare(remappedBounty);
      if (remappedBoundPair !== boundPair) setBoundPair(remappedBoundPair);
      setOwnedSpells((prev) => {
        const idx = prev.findIndex((s) => s.spellId === 'teleport');
        if (idx === -1) return prev;
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
      lastCastSpellRef.current = { casterColor: resolvedPlayerColor, spellId: 'teleport', targets: [squareA, squareB] };
      setHasCastSpellThisTurn(true);
      setArmedSpell(null);
      setSpellCastTargets([]);
      logSpellCast('teleport', [squareA, squareB]);
      triggerTrapIfLanded([squareA, squareB], { trapSquares, bountyMarkedSquare: remappedBounty, bountyMarkedByColor, boundPair: remappedBoundPair });
      setFen(chess.fen());
      playSfx('spellTeleport');
      haptics.success();
      applyGhostCheckIfAny();
      checkForSpellInducedGameOver();
    },
    [
      shieldedSquare,
      leapArmedSquare,
      celesteArmedSquare,
      resurrectionArmedSquare,
      bountyMarkedSquare,
      bountyMarkedByColor,
      boundPair,
      trapSquares,
      resolvedPlayerColor,
      playSfx,
      haptics,
      applyGhostCheckIfAny,
      checkForSpellInducedGameOver,
      triggerTrapIfLanded,
      logSpellCast,
    ],
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

    // Gartin's fixed opening: plays these moves verbatim, ignoring the search engine entirely,
    // before switching to full-strength play once the list is exhausted. Bails out permanently
    // (for the rest of the match) the moment the script stops making sense: the piece it expects
    // to move is simply gone (e.g. the player captured that knight), or the move is still legal
    // but would walk it straight into a pawn's capture — any *other* piece threatening the square
    // is fine, only a pawn triggers the bailout, per design.
    const scriptedMoves = opponent.scriptedOpeningMoves;
    const scriptedMove = scriptedMoves?.[scriptedMoveIndexRef.current];
    if (scriptedMove) {
      const from = scriptedMove.from as Square;
      const to = scriptedMove.to as Square;
      const isLegal = chess.moves({ square: from, verbose: true }).some((m) => m.to === to);
      const threatenedByPawn = isLegal && chess.attackers(to, resolvedPlayerColor).some((sq) => chess.get(sq)?.type === 'p');
      if (isLegal && !threatenedByPawn) {
        scriptedMoveIndexRef.current += 1;
        setIsAiThinking(true);
        const timer = setTimeout(() => {
          if (finishedRef.current) return;
          applyMove({ from, to });
          setIsAiThinking(false);
        }, 500 + Math.random() * 600);
        // `clearTimeout` alone is enough cancellation here (no promise in flight to race
        // against), so — unlike the search path below — there's no `cancelled`-flag footgun.
        return () => clearTimeout(timer);
      }
      // Script broken — jump past the end of the list so every future check on this ref short-
      // circuits straight to full-strength search, permanently, for the rest of the match.
      scriptedMoveIndexRef.current = scriptedMoves.length;
    }

    let cancelled = false;
    setIsAiThinking(true);
    computeAiMove({
      fen: chess.fen(),
      aiDepth: opponent.aiDepth,
      aiSkillNoise: opponent.aiSkillNoise,
      style: opponent.style,
      protectedSquare: shieldArmedForAiTurn ? shieldedSquare : null,
      frozenSquare: entraveArmedForAiTurn ? entraveArmedSquare : null,
      disguisedColor: camouflageArmedForAiTurn ? resolvedPlayerColor : null,
    })
      .then((response) => {
        if (cancelled || finishedRef.current) return;
        applyMove({ from: response.move.from, to: response.move.to, promotion: response.move.promotion as PieceSymbol | undefined });
      })
      .catch((error) => {
        console.error('[game] AI move failed', error);
      })
      .finally(() => {
        // Always clear the thinking flag once this particular computation settles — NOT gated on
        // `cancelled`. Applying the move inside `.then()` above calls `setFen`, which changes this
        // effect's own dependency and re-runs it synchronously before this `.finally()` gets to
        // run (both are microtasks racing after the same promise resolution) — that re-run's
        // cleanup sets `cancelled = true` on THIS closure before we ever get here. Gating on it
        // left `isAiThinking` stuck `true` forever after the very first AI move: every future
        // click was silently ignored because `isPlayerTurn` requires `!isAiThinking`. The `if
        // (cancelled...)` check inside `.then()` above is what actually prevents a stale response
        // from being applied — this reset doesn't need (and must not have) the same guard.
        setIsAiThinking(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, opponent]);

  // Clocks — Adventure-mode matches (isUntimed) never tick and can never end by timeout.
  useEffect(() => {
    if (isGameOver || promotionPending || isUntimed) return;
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
  }, [finalizeGame, promotionPending, resolvedPlayerColor, isGameOver, isUntimed]);

  const handleSpellTargetTap = (square: Square) => {
    if (!armedSpell) return;
    const chess = chessRef.current;
    const piece = chess.get(square);
    // Blanket rule, checked once up front rather than trusting every branch below to repeat it:
    // no spell may ever target a king, under any circumstance. A king can only ever be moved by
    // its owner making their own normal move (including castling) — never by a spell.
    if (piece?.type === 'k') return;

    const consumeArmedSpell = (targets: Square[]) => {
      setOwnedSpells((prev) => {
        const idx = prev.findIndex((s) => s.spellId === armedSpell);
        if (idx === -1) return prev;
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
      lastCastSpellRef.current = { casterColor: resolvedPlayerColor, spellId: armedSpell!, targets };
      setHasCastSpellThisTurn(true);
      setArmedSpell(null);
      setSpellCastTargets([]);
      logSpellCast(armedSpell!, targets);
    };

    // Safety net: whatever unexpected edge case might slip through the checks above (or a future
    // one not yet found) throws instead of silently corrupting the board, this catches it and
    // resets to a clean, tappable state instead of leaving the match stuck with no visible cause.
    try {
      runSpellTargetTap();
    } catch (error) {
      console.error('[game] spell cast failed, resetting to a clean state', error);
      setArmedSpell(null);
      setSpellCastTargets([]);
      setIsSpellResolving(false);
      setExplosionPreviewSquares([]);
      showSpellFeedback(t('spell.castFailed'));
    }

    function runSpellTargetTap() {
    if (armedSpell === 'explosion') {
      if (!piece || piece.color !== resolvedPlayerColor || piece.type !== 'p') return;
      const blastSquares = getBlastSquares(square);
      setExplosionPreviewSquares(blastSquares);
      setIsSpellResolving(true);
      consumeArmedSpell([square]);
      setTimeout(() => {
        // This runs on its own timer tick, outside the try/catch wrapping the rest of this
        // function's synchronous body — needs its own safety net so a failure here can't leave
        // `isSpellResolving` stuck `true` forever (which would permanently block the board).
        try {
          // Track ally deaths (for Résurrection) before the pieces are actually destroyed.
          for (const sq of blastSquares) {
            const victim = chess.get(sq);
            if (victim && victim.type !== 'k' && victim.color === resolvedPlayerColor) {
              deadAllyPiecesRef.current.push(victim.type);
            }
          }
          const { destroyedSquares } = applyExplosion(chess, square);
          const extra = reactToDestruction(destroyedSquares);
          invalidateStaleSquares([...destroyedSquares, ...extra]);
          setFen(chess.fen());
          playSfx('spellExplosion');
          haptics.capture();
          applyGhostCheckIfAny();
          checkForSpellInducedGameOver();
        } catch (error) {
          console.error('[game] explosion resolution failed', error);
          showSpellFeedback(t('spell.castFailed'));
        } finally {
          setExplosionPreviewSquares([]);
          setIsSpellResolving(false);
        }
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
      if (wouldTeleportStrandPawn(chess, first, square)) return;
      // Landing on the enemy's back rank is a real promotion — let the player pick a piece
      // instead of applying the swap immediately (see finishTeleportResolution).
      const promotionSquare = getTeleportPromotionSquare(chess, first, square);
      if (promotionSquare) {
        const pawnSquare = promotionSquare === first ? square : first;
        setPromotionPending({ from: pawnSquare, to: promotionSquare, isLeap: false, isTeleport: true });
        return;
      }
      applyTeleport(chess, first, square);
      finishTeleportResolution(first, square);
      return;
    }

    if (armedSpell === 'shield') {
      if (!piece || piece.color !== resolvedPlayerColor || piece.type === 'k') return;
      setShieldedSquare(square);
      consumeArmedSpell([square]);
      playSfx('spellShield');
      haptics.success();
      return;
    }

    if (armedSpell === 'leap') {
      if (!piece || piece.color !== resolvedPlayerColor || piece.type === 'k') return;
      setLeapArmedSquare(square);
      consumeArmedSpell([square]);
      playSfx('spellLeap');
      haptics.success();
      return;
    }

    if (armedSpell === 'celeste') {
      if (!piece || piece.color !== resolvedPlayerColor || piece.type === 'k') return;
      setCelesteArmedSquare(square);
      consumeArmedSpell([square]);
      playSfx('spellLeap');
      haptics.success();
      return;
    }

    if (armedSpell === 'resurrection') {
      if (!piece || piece.color !== resolvedPlayerColor || piece.type === 'k') return;
      setResurrectionArmedSquare(square);
      consumeArmedSpell([square]);
      playSfx('spellShield');
      haptics.success();
      return;
    }

    if (armedSpell === 'entrave') {
      if (!piece || piece.color !== opponentColor || piece.type === 'k') return;
      if (!chess.isAttacked(square, resolvedPlayerColor)) return;
      setEntraveArmedSquare(square);
      consumeArmedSpell([square]);
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
      consumeArmedSpell([square]);
      setFen(chess.fen());
      playSfx('spellTeleport');
      haptics.success();
      applyGhostCheckIfAny();
      checkForSpellInducedGameOver();
      return;
    }

    if (armedSpell === 'prix_du_sang') {
      if (!piece || piece.color !== resolvedPlayerColor || piece.type === 'k') return;
      const value = CAPTURE_GOLD_VALUE[piece.type];
      chess.remove(square);
      const extra = reactToDestruction([square]);
      invalidateStaleSquares([square, ...extra]);
      setGold((g) => g + value);
      consumeArmedSpell([square]);
      setFen(chess.fen());
      playSfx('spellExplosion');
      haptics.success();
      applyGhostCheckIfAny();
      checkForSpellInducedGameOver();
      return;
    }

    if (armedSpell === 'piege_invisible') {
      if (piece || trapSquares.includes(square)) return;
      setTrapSquares((prev) => [...prev, square]);
      consumeArmedSpell([square]);
      playSfx('spellShield');
      haptics.success();
      return;
    }

    if (armedSpell === 'echo_du_passe') {
      if (!piece || piece.type === 'k') return;
      const previous = previousSquareMap[square];
      if (!previous || chess.get(previous)) return;
      applyEchoOfThePast(chess, square, previous);
      invalidateStaleSquares([square]);
      consumeArmedSpell([square]);
      triggerTrapIfLanded([previous]);
      setFen(chess.fen());
      playSfx('spellTeleport');
      haptics.success();
      applyGhostCheckIfAny();
      checkForSpellInducedGameOver();
      return;
    }

    if (armedSpell === 'chasseur_de_prime') {
      if (!piece || piece.color !== opponentColor || piece.type === 'k') return;
      setBountyMarkedSquare(square);
      setBountyMarkedByColor(resolvedPlayerColor);
      consumeArmedSpell([square]);
      playSfx('spellShield');
      haptics.success();
      return;
    }

    if (armedSpell === 'liaison_funeste') {
      if (spellCastTargets.length === 0) {
        if (!piece || piece.color !== resolvedPlayerColor || piece.type === 'k') return;
        setSpellCastTargets([square]);
        return;
      }
      const allySquare = spellCastTargets[0]!;
      if (!piece || piece.color !== opponentColor || piece.type === 'k') return;
      if (!hasLineOfSight(chess, allySquare, square)) return;
      setBoundPair([allySquare, square]);
      consumeArmedSpell([allySquare, square]);
      playSfx('spellTeleport');
      haptics.success();
    }
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
    try {
      if (promotionPending.isTeleport) {
        applyTeleportWithPromotion(chessRef.current, promotionPending.from, promotionPending.to, piece as 'q' | 'r' | 'b' | 'n');
        finishTeleportResolution(promotionPending.from, promotionPending.to);
      } else if (promotionPending.isLeap) {
        applyLeapMoveAndAdvance(promotionPending.from, promotionPending.to, piece);
      } else {
        applyMove({ from: promotionPending.from, to: promotionPending.to, promotion: piece });
      }
    } catch (error) {
      console.error('[game] promotion resolution failed', error);
      showSpellFeedback(t('spell.castFailed'));
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
    const freeSpells = opponent?.freeSpells ?? false;
    if (!freeSpells && gold < def.cost) return;
    // Only one unspent copy of a given spell at a time — buying another before casting the one
    // you have (whether it's castable yet or still greyed out from this turn's purchase) is
    // blocked, both here and by the shop button itself being disabled in RightSpellPanel.
    if (ownedSpells.some((s) => s.spellId === spellId)) return;
    // Inventory cap — same guard duplicated in RightSpellPanel's own disabled state.
    if (ownedSpells.length >= MAX_OWNED_SPELLS) return;
    if (!freeSpells) setGold((g) => g - def.cost);
    setOwnedSpells((prev) => [...prev, { instanceId: `${spellId}-${Date.now()}-${Math.random()}`, spellId, boughtThisTurn: true }]);
    playSfx('spellBuy');
    haptics.success();
  };

  const showSpellFeedback = (message: string) => {
    setSpellFeedbackMessage(message);
    setTimeout(() => setSpellFeedbackMessage(null), 1800);
  };

  /** Casts a 0-target spell immediately — no square to tap, so arming would just be a dead end. */
  const handleInstantSpellCast = (spellId: SpellId) => {
    const consumeInstant = () => {
      setOwnedSpells((prev) => {
        const idx = prev.findIndex((s) => s.spellId === spellId);
        if (idx === -1) return prev;
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
      lastCastSpellRef.current = { casterColor: resolvedPlayerColor, spellId, targets: [] };
      setHasCastSpellThisTurn(true);
      logSpellCast(spellId, []);
    };

    if (spellId === 'oeil_pour_oeil') {
      consumeInstant();
      setGold(0);
      aiGoldRef.current = 0;
      playSfx('gold');
      haptics.success();
      return;
    }
    if (spellId === 'camouflage') {
      consumeInstant();
      setCamouflageArmedForAiTurn(true);
      playSfx('spellShield');
      haptics.success();
      return;
    }
    if (spellId === 'silencium') {
      consumeInstant();
      setSilencedColor(opponentColor);
      setSilencedArmedForAiTurn(true);
      playSfx('spellShield');
      haptics.success();
      return;
    }
    if (spellId === 'reflexion') {
      // The AI never casts spells today (see lastCastSpellRef's docs), so this branch can never
      // find an opponent-cast spell to copy — always shows the "nothing to copy" feedback instead
      // of consuming the spell. Kept ready for a future spell-casting opponent.
      const last = lastCastSpellRef.current;
      if (!last || last.casterColor !== opponentColor) {
        showSpellFeedback(t('spell.nothingToReflect'));
        return;
      }
    }
  };

  const handleArmSpell = (spellId: SpellId) => {
    if (!isPlayerTurn) return;
    if (armedSpell === spellId) {
      setArmedSpell(null);
      setSpellCastTargets([]);
      return;
    }
    if (hasCastSpellThisTurn) {
      showSpellFeedback(t('spell.oneSpellPerTurn'));
      return;
    }
    if (ownedSpells.find((s) => s.spellId === spellId)?.boughtThisTurn) {
      showSpellFeedback(t('spell.boughtThisTurnMessage'));
      return;
    }
    if (silencedColor === resolvedPlayerColor) {
      showSpellFeedback(t('spell.silencedMessage'));
      return;
    }
    if (getSpellDef(spellId).targetCount === 0) {
      handleInstantSpellCast(spellId);
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

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isCompact = windowWidth < 500;
  // Scales with the viewport instead of a fixed pixel cap, so the shop/chat panels stay readable
  // on wide desktop/web windows instead of being stuck at the size tuned for a narrow phone.
  const sidePanelWidth = isCompact
    ? Math.round(Math.min(120, Math.max(84, windowWidth * 0.22)))
    : Math.round(Math.min(300, Math.max(170, windowWidth * 0.19)));
  const boardSize = useMemo(() => {
    const rowGap = spacing.xs * 2;
    const availableWidth = windowWidth - spacing.md * 2 - sidePanelWidth * 2 - rowGap;
    const availableHeight = windowHeight * 0.68;
    return Math.max(140, Math.min(availableWidth, availableHeight, 760));
  }, [windowWidth, windowHeight, sidePanelWidth]);

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
          showClock={!isUntimed}
          missingPieces={topColor === 'w' ? blackMissing : whiteMissing}
          advantage={topColor === 'w' ? whiteAdvantage : blackAdvantage}
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
            isMusicPlaying={musicStatus.playing}
            onToggleMusicPlayback={() => (musicStatus.playing ? pauseMatchMusic() : resumeMatchMusic())}
            onNextTrack={nextMatchTrack}
            onPrevTrack={previousMatchTrack}
            logEntries={gameLog}
          />

          <View style={styles.center}>
            {/* Fixed to exactly the board's own size so `center`'s centering is driven purely by
                the board — the status text and cancel button float above/below it (absolutely
                positioned) instead of adding to the centered block's height, which used to push
                the board down and leave uneven black space above vs. below it. */}
            <View style={[styles.boardStage, { width: boardSize, height: boardSize }]}>
              <View style={styles.statusArea}>
                {ghostCheckMessage && <Text style={styles.ghostCheckBanner}>{ghostCheckMessage}</Text>}
                {derivedChess.inCheck() && !isGameOver && <Text style={styles.checkBanner}>{t('game.check')}</Text>}
                {isAiThinking && (
                  <Text style={styles.statusText}>{t('game.opponentTurn', { name: opponent.username })}</Text>
                )}
                {armedSpell && (
                  <Text style={styles.statusText}>
                    {armedSpell === 'explosion' && t('spell.chooseTargetPawn')}
                    {armedSpell === 'teleport' && (spellCastTargets.length === 0 ? t('spell.chooseFirstAlly') : t('spell.chooseSecondAlly'))}
                    {armedSpell === 'liaison_funeste' &&
                      (spellCastTargets.length === 0 ? t('spell.chooseAllyTarget') : t('spell.chooseEnemyTarget'))}
                    {(armedSpell === 'entrave' || armedSpell === 'corruption' || armedSpell === 'chasseur_de_prime') &&
                      t('spell.chooseEnemyTarget')}
                    {(armedSpell === 'shield' ||
                      armedSpell === 'leap' ||
                      armedSpell === 'celeste' ||
                      armedSpell === 'resurrection' ||
                      armedSpell === 'prix_du_sang') &&
                      t('spell.chooseAllyTarget')}
                    {armedSpell === 'piege_invisible' && t('spell.chooseEmptySquare')}
                    {armedSpell === 'echo_du_passe' && t('spell.chooseEchoTarget')}
                  </Text>
                )}
                {spellFeedbackMessage && <Text style={styles.statusText}>{spellFeedbackMessage}</Text>}
                {drawOfferMessage && <Text style={styles.statusText}>{drawOfferMessage}</Text>}
              </View>

              <View style={styles.boardWrap}>
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
                  trapSquares={trapSquares}
                  interactive={isPlayerTurn}
                  onSquareTap={handleSquareTap}
                  onPieceDrop={handlePieceDrop}
                />
              </View>

              {armedSpell && (
                <Pressable onPress={() => handleArmSpell(armedSpell)} style={styles.cancelSpellButton}>
                  <Text style={styles.cancelSpellLabel}>✕ {t('spell.cancelCast')}</Text>
                </Pressable>
              )}
            </View>
          </View>

          <RightSpellPanel
            width={sidePanelWidth}
            gold={gold}
            ownedSpells={ownedSpells}
            aiOwnedSpells={aiOwnedSpells}
            armedSpell={armedSpell}
            castingDisabled={hasCastSpellThisTurn}
            availableSpellIds={opponent.availableSpellIds}
            freeSpells={opponent.freeSpells}
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
          showClock={!isUntimed}
          missingPieces={bottomColor === 'w' ? blackMissing : whiteMissing}
          advantage={bottomColor === 'w' ? whiteAdvantage : blackAdvantage}
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
  showClock = true,
  missingPieces,
  advantage,
}: {
  isOpponent: boolean;
  opponent: OpponentProfile;
  profile: PlayerProfile;
  color: PieceColor;
  clockMs: number;
  active: boolean;
  showClock?: boolean;
  missingPieces: PieceSymbol[];
  advantage: number;
}) {
  return (
    <View style={styles.playerBar}>
      <View style={styles.playerInfo}>
        <Avatar avatar={isOpponent ? opponent.avatar : profile.avatar} photoUri={isOpponent ? undefined : profile.photoUri} size={36} />
        <View style={styles.playerNameCol}>
          <Text style={styles.playerName} numberOfLines={1}>
            {isOpponent ? opponent.username : profile.username}
          </Text>
          <CapturedPieces missingPieces={missingPieces} advantage={advantage} />
        </View>
        <Text style={styles.playerColorDot}>{color === 'w' ? '♔' : '♚'}</Text>
      </View>
      <View style={[styles.clock, active && styles.clockActive]}>
        <Text style={[styles.clockText, active && styles.clockTextActive]}>{showClock ? formatClock(clockMs) : '∞'}</Text>
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
  },
  // Sized to exactly the board — everything inside floats above/below via absolute positioning
  // instead of adding to `center`'s centered block, which used to push the board off true
  // center (more black space on one side than the other).
  boardStage: {
    position: 'relative',
  },
  // Fixed height reserved above the board regardless of which status text (if any) is showing,
  // so the check/turn/spell-prompt messages appearing and disappearing never nudge the board's
  // position — that reflow was the board "shaking" every time the turn passed between players.
  statusArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    marginBottom: spacing.sm,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  boardWrap: {
    borderRadius: 6,
    backgroundColor: palette.voidBlack,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
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
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    marginTop: spacing.sm,
    alignItems: 'center',
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
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  playerNameCol: {
    flexShrink: 1,
    gap: 1,
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
