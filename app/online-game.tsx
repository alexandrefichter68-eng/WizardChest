import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { LeftGamePanel, type ChatEntry, type GameLogEntry } from '@/components/LeftGamePanel';
import { PromotionModal } from '@/components/PromotionModal';
import { RightSpellPanel } from '@/components/RightSpellPanel';
import { findKingSquare, getMissingPieces, isEnemyKingAttacked } from '@/engine/boardUtils';
import { applyCelesteMove, getCelesteDestinations } from '@/engine/celesteMoves';
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
import { getDivisionForElo } from '@/domain/divisions';
import { CAPTURE_GOLD_VALUE, MAX_OWNED_SPELLS, getSpellDef, nextCheckGoldReward, type OwnedSpell, type SpellId } from '@/domain/spells';
import { computeXpGain } from '@/domain/xp';
import { useHaptics } from '@/hooks/useHaptics';
import { useSfx } from '@/hooks/useSfx';
import { supabase } from '@/lib/supabase';
import { createAvatarForUsername } from '@/domain/avatar';
import { useAuthStore } from '@/store/authStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMatchStore } from '@/store/matchStore';
import { useProfileStore } from '@/store/profileStore';
import { useRewardsStore } from '@/store/rewardsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { palette } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';
import type { GameEndReason, GameResultKind, PieceColor } from '@/types';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const STANDARD_PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function otherOf(color: PieceColor): PieceColor {
  return color === 'w' ? 'b' : 'w';
}

interface ColorMap<T> {
  w: T;
  b: T;
}

interface BountyMark {
  square: Square;
  ownerColor: PieceColor;
}

/**
 * The full shared state of an online spell match — everything the local single-player `game.tsx`
 * keeps as separate `useState`s, restructured per-color since here BOTH sides can independently
 * cast spells (locally, only the human ever does; the "AI" never does, so it never needed this).
 * One player computes the next value of this whole object after their action and writes it to
 * `live_matches.battle_state`; the other player's client receives it via Realtime and replaces its
 * local copy wholesale — nobody ever recomputes the opponent's turn, only mirrors it.
 */
interface OnlineBattleState {
  fen: string;
  gold: ColorMap<number>;
  ownedSpells: ColorMap<OwnedSpell[]>;
  hasCastSpellThisTurn: ColorMap<boolean>;
  /** Two-phase: `shields[color]` is the protected square; `shieldArmed[color]` only flips true once
   * the caster's own next move completes, so the window always covers exactly one full opponent
   * turn (see `advanceTurnState`). Same pattern for `entraves`. */
  shields: ColorMap<Square | null>;
  shieldArmed: ColorMap<boolean>;
  entraves: ColorMap<Square | null>;
  entraveArmed: ColorMap<boolean>;
  leapArmed: ColorMap<Square | null>;
  celesteArmed: ColorMap<Square | null>;
  resurrectionArmed: ColorMap<Square | null>;
  trapSquares: Square[];
  bounty: BountyMark | null;
  boundPair: [Square, Square] | null;
  /** Instant at cast (no arm-phase needed, no tracked square) — cleared after the disguised side's
   * opponent gets their one turn to be fooled. */
  camouflage: ColorMap<boolean>;
  /** Instant at cast, targets the opponent — cleared after their next move. */
  silenced: ColorMap<boolean>;
  previousSquareMap: Partial<Record<Square, Square>>;
  deadAllies: ColorMap<PieceSymbol[]>;
  checksDelivered: ColorMap<number>;
  gameLog: GameLogEntry[];
  chat: ChatEntry[];
  lastMove: { from: Square; to: Square } | null;
  status: 'active' | 'finished';
  winner: 'white' | 'black' | 'draw' | null;
  endReason: GameEndReason | null;
}

function createInitialBattleState(): OnlineBattleState {
  return {
    fen: new Chess().fen(),
    gold: { w: 0, b: 0 },
    ownedSpells: { w: [], b: [] },
    hasCastSpellThisTurn: { w: false, b: false },
    shields: { w: null, b: null },
    shieldArmed: { w: false, b: false },
    entraves: { w: null, b: null },
    entraveArmed: { w: false, b: false },
    leapArmed: { w: null, b: null },
    celesteArmed: { w: null, b: null },
    resurrectionArmed: { w: null, b: null },
    trapSquares: [],
    bounty: null,
    boundPair: null,
    camouflage: { w: false, b: false },
    silenced: { w: false, b: false },
    previousSquareMap: {},
    deadAllies: { w: [], b: [] },
    checksDelivered: { w: 0, b: 0 },
    gameLog: [],
    chat: [],
    lastMove: null,
    status: 'active',
    winner: null,
    endReason: null,
  };
}

function pushCapped<T>(list: T[], entry: T, max: number): T[] {
  const next = [...list, entry];
  return next.length > max ? next.slice(next.length - max) : next;
}

function invalidateStale(next: OnlineBattleState, affected: Square[]) {
  (['w', 'b'] as PieceColor[]).forEach((c) => {
    if (next.shields[c] && affected.includes(next.shields[c]!)) {
      next.shields[c] = null;
      next.shieldArmed[c] = false;
    }
    if (next.leapArmed[c] && affected.includes(next.leapArmed[c]!)) next.leapArmed[c] = null;
    if (next.celesteArmed[c] && affected.includes(next.celesteArmed[c]!)) next.celesteArmed[c] = null;
    if (next.resurrectionArmed[c] && affected.includes(next.resurrectionArmed[c]!)) next.resurrectionArmed[c] = null;
    if (next.entraves[c] && affected.includes(next.entraves[c]!)) {
      next.entraves[c] = null;
      next.entraveArmed[c] = false;
    }
  });
}

function reactToDestructionState(next: OnlineBattleState, chess: Chess, destroyedSquares: Square[]): Square[] {
  const state: DestructionReactionState = {
    trapSquares: next.trapSquares,
    bountyMarkedSquare: next.bounty?.square ?? null,
    bountyMarkedByColor: next.bounty?.ownerColor ?? null,
    boundPair: next.boundPair,
  };
  const reaction = resolveDestructionReactions(destroyedSquares, state);
  for (const sq of reaction.extraDestroyedSquares) {
    const victim = chess.get(sq);
    if (!victim || victim.type === 'k') continue;
    next.deadAllies[victim.color].push(victim.type);
    chess.remove(sq);
  }
  if (reaction.goldStolenBy) {
    const victim = otherOf(reaction.goldStolenBy);
    next.gold[reaction.goldStolenBy] += next.gold[victim];
    next.gold[victim] = 0;
  }
  if (reaction.consumedTrapSquares.length > 0) {
    next.trapSquares = next.trapSquares.filter((sq) => !reaction.consumedTrapSquares.includes(sq));
  }
  if (reaction.bountyConsumed) next.bounty = null;
  if (reaction.boundPairConsumed) next.boundPair = null;
  return reaction.extraDestroyedSquares;
}

function triggerTrap(next: OnlineBattleState, chess: Chess, landedSquares: Square[]) {
  const hit = landedSquares.filter((sq) => next.trapSquares.includes(sq));
  if (hit.length === 0) return;
  const destroyed: Square[] = [];
  for (const sq of hit) {
    const victim = chess.get(sq);
    if (!victim || victim.type === 'k') continue;
    next.deadAllies[victim.color].push(victim.type);
    chess.remove(sq);
    destroyed.push(sq);
  }
  if (destroyed.length === 0) return;
  const extra = reactToDestructionState(next, chess, destroyed);
  invalidateStale(next, [...destroyed, ...extra]);
}

/** Returns the gold reward if this spell just exposed the enemy king mid-turn, else null. */
function applyGhostCheckIfAny(next: OnlineBattleState, chess: Chess, casterColor: PieceColor): number | null {
  if (!isEnemyKingAttacked(chess, casterColor)) return null;
  const reward = nextCheckGoldReward(next.checksDelivered[casterColor]);
  next.checksDelivered[casterColor] += 1;
  next.gold[casterColor] += reward;
  return reward;
}

function markGameOverIfAny(next: OnlineBattleState, chess: Chess, moverColor: PieceColor) {
  if (next.status === 'finished') return;
  if (chess.isCheckmate()) {
    next.status = 'finished';
    next.winner = moverColor === 'w' ? 'white' : 'black';
    next.endReason = 'checkmate';
  } else if (chess.isStalemate()) {
    next.status = 'finished';
    next.winner = 'draw';
    next.endReason = 'stalemate';
  } else if (chess.isThreefoldRepetition()) {
    next.status = 'finished';
    next.winner = 'draw';
    next.endReason = 'threefold_repetition';
  } else if (chess.isInsufficientMaterial()) {
    next.status = 'finished';
    next.winner = 'draw';
    next.endReason = 'insufficient_material';
  } else if (chess.isDraw()) {
    next.status = 'finished';
    next.winner = 'draw';
    next.endReason = 'fifty_move_rule';
  }
}

/** Shared turn-boundary bookkeeping, run once by whoever just moved (normal move, leap, or céleste). */
function advanceTurnState(next: OnlineBattleState, moverColor: PieceColor, from: Square, to: Square) {
  const other = otherOf(moverColor);
  const remap = (sq: Square | null) => (sq === from ? to : sq);
  next.shields[moverColor] = remap(next.shields[moverColor]);

  next.leapArmed[moverColor] = null;
  next.celesteArmed[moverColor] = null;
  next.resurrectionArmed[moverColor] = null;

  if (next.shields[moverColor] && !next.shieldArmed[moverColor]) next.shieldArmed[moverColor] = true;
  if (next.shields[other] && next.shieldArmed[other]) {
    next.shields[other] = null;
    next.shieldArmed[other] = false;
  }
  if (next.entraves[moverColor] && !next.entraveArmed[moverColor]) next.entraveArmed[moverColor] = true;
  if (next.entraves[other] && next.entraveArmed[other]) {
    next.entraves[other] = null;
    next.entraveArmed[other] = false;
  }
  if (next.camouflage[other]) next.camouflage[other] = false;
  if (next.silenced[moverColor]) next.silenced[moverColor] = false;

  next.hasCastSpellThisTurn[other] = false;
  next.ownedSpells[other] = next.ownedSpells[other].map((s) => (s.boughtThisTurn ? { ...s, boughtThisTurn: false } : s));
}

interface MoveParams {
  from: Square;
  to: Square;
  capturedType: PieceSymbol | null;
  isPromotion: boolean;
  notation: string;
  piece: PieceSymbol;
}

/** Mirrors `finishMoveEffects` from the local game, minus the fake-AI-economy branch — there's no
 * AI here, each side always manages its own real gold/spells via this same function. */
function applyMoveToState(prev: OnlineBattleState, chess: Chess, moverColor: PieceColor, params: MoveParams, moverName: string): OnlineBattleState {
  const next: OnlineBattleState = structuredClone(prev);
  next.previousSquareMap = { ...next.previousSquareMap, [params.to]: params.from };
  next.lastMove = { from: params.from, to: params.to };
  next.gameLog = pushCapped(next.gameLog, { id: `log-${Date.now()}-${Math.random()}`, text: `${moverName}: ${params.notation}` }, 200);

  if (next.bounty?.square === params.from) next.bounty = { ...next.bounty, square: params.to };
  if (next.boundPair) {
    next.boundPair = [next.boundPair[0] === params.from ? params.to : next.boundPair[0], next.boundPair[1] === params.from ? params.to : next.boundPair[1]];
  }
  triggerTrap(next, chess, [params.to]);
  next.fen = chess.fen();

  const isMate = chess.isCheckmate();
  const isCheck = chess.inCheck();

  let goldGained = 0;
  if (params.capturedType) goldGained += CAPTURE_GOLD_VALUE[params.capturedType];
  if (isCheck && !isMate) {
    goldGained += nextCheckGoldReward(next.checksDelivered[moverColor]);
    next.checksDelivered[moverColor] += 1;
  }
  next.gold[moverColor] += goldGained;

  if (next.resurrectionArmed[moverColor] === params.from && params.capturedType) {
    const graveyard = next.deadAllies[moverColor];
    if (graveyard.length > 0) {
      const idx = Math.floor(Math.random() * graveyard.length);
      const revivedType = graveyard[idx]!;
      next.deadAllies[moverColor] = graveyard.filter((_, i) => i !== idx);
      chess.put({ type: revivedType, color: moverColor }, params.from);
      promoteEdgePawns(chess, [params.from]);
      next.fen = chess.fen();
    }
  }

  if (params.capturedType) next.deadAllies[otherOf(moverColor)].push(params.capturedType);
  if (params.capturedType) {
    const extra = reactToDestructionState(next, chess, [params.to]);
    if (extra.length > 0) invalidateStale(next, extra);
    next.fen = chess.fen();
  }

  advanceTurnState(next, moverColor, params.from, params.to);
  markGameOverIfAny(next, chess, moverColor);
  return next;
}

export default function OnlineGameScreen() {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const playSfx = useSfx();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const myId = useAuthStore((s) => s.session?.user.id);

  const profile = useProfileStore((s) => s.profile);
  const applyGameResult = useProfileStore((s) => s.applyGameResult);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);
  const unlockAchievements = useRewardsStore((s) => s.unlockMany);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const musicStatus = useMatchMusicStatus();
  const boardTheme = getBoardTheme(profile.activeBoardTheme);
  const pieceTheme = getPieceTheme(profile.activePieceTheme);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<PieceColor | null>(null);
  const [opponentName, setOpponentName] = useState<string>('…');
  const [battle, setBattle] = useState<OnlineBattleState | null>(null);
  const startedAtRef = useRef(Date.now());
  const finalizedRef = useRef(false);
  const lastAppliedNotifiedFen = useRef<string | null>(null);

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [armedSpell, setArmedSpell] = useState<SpellId | null>(null);
  const [spellCastTargets, setSpellCastTargets] = useState<Square[]>([]);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square; isTeleport?: boolean; isLeap?: boolean } | null>(null);
  const [explosionPreviewSquares, setExplosionPreviewSquares] = useState<Square[]>([]);
  const [isSpellResolving, setIsSpellResolving] = useState(false);
  const [spellFeedbackMessage, setSpellFeedbackMessage] = useState<string | null>(null);
  const [ghostCheckMessage, setGhostCheckMessage] = useState<string | null>(null);
  const [resignConfirmOpen, setResignConfirmOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const pushBattle = useCallback(
    (next: OnlineBattleState) => {
      setBattle(next);
      void supabase
        .from('live_matches')
        .update({ battle_state: next, fen: next.fen, status: next.status, winner: next.winner, updated_at: new Date().toISOString() })
        .eq('id', matchId)
        .then(({ error }) => {
          if (error) console.error('[online-game] pushBattle failed', error);
        });
    },
    [matchId],
  );

  useEffect(() => {
    if (!matchId || !myId) return;
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
        const white = data.white_id === myId;
        setMyColor(white ? 'w' : 'b');
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', [data.white_id, data.black_id]);
        const opponentId = white ? data.black_id : data.white_id;
        const oppUsername = profiles?.find((p) => p.id === opponentId)?.username ?? '?';
        if (!cancelled) setOpponentName(oppUsername);

        if (data.battle_state) {
          if (!cancelled) setBattle(data.battle_state as OnlineBattleState);
        } else {
          const initial = createInitialBattleState();
          if (!cancelled) setBattle(initial);
          await supabase.from('live_matches').update({ battle_state: initial }).eq('id', matchId).is('battle_state', null);
        }
      });

    const channel = supabase
      .channel(`live-battle-${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_matches', filter: `id=eq.${matchId}` }, (payload) => {
        const row = payload.new as { battle_state: OnlineBattleState | null };
        if (row.battle_state) setBattle(row.battle_state);
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [matchId, myId, t]);

  // Feedback (sound/haptics/ghost-check banner) for whatever the *opponent* just did, derived by
  // diffing against the last state we already reacted to — this client never re-runs the reducer
  // for the opponent's move, so it can't know "capture vs check vs mate" from a function return;
  // it infers it from the new board the same way a human would just by looking at it.
  const prevBattleRef = useRef<OnlineBattleState | null>(null);
  useEffect(() => {
    if (!battle || !myColor) return;
    const prev = prevBattleRef.current;
    prevBattleRef.current = battle;
    if (!prev || prev.fen === battle.fen) return;
    if (lastAppliedNotifiedFen.current === battle.fen) return;
    lastAppliedNotifiedFen.current = battle.fen;
    const chess = new Chess(battle.fen);
    const prevChess = new Chess(prev.fen);
    const pieceCountNow = chess.board().flat().filter(Boolean).length;
    const pieceCountBefore = prevChess.board().flat().filter(Boolean).length;
    if (chess.isCheckmate()) {
      playSfx('checkmate');
      haptics.error();
    } else if (chess.inCheck()) {
      playSfx('check');
      haptics.warning();
    } else if (pieceCountNow < pieceCountBefore) {
      playSfx('capture');
      haptics.capture();
    } else {
      playSfx('move');
      haptics.move();
    }
  }, [battle, myColor, playSfx, haptics]);

  const otherColor = myColor ? otherOf(myColor) : null;
  const chess = useMemo(() => (battle ? new Chess(battle.fen) : null), [battle]);

  // Finalize once, whichever side we ended up on, the moment shared status flips to 'finished'.
  useEffect(() => {
    if (!battle || !myColor || !chess) return;
    if (battle.status !== 'finished' || finalizedRef.current) return;
    finalizedRef.current = true;

    const result: GameResultKind = battle.winner === 'draw' ? 'draw' : battle.winner === (myColor === 'w' ? 'white' : 'black') ? 'win' : 'loss';
    const opponentProfile = {
      id: `online-${matchId}`,
      username: opponentName,
      countryCode: 'FR',
      elo: profile.elo,
      division: getDivisionForElo(profile.elo).id,
      winRate: 0.5,
      gamesPlayed: 0,
      style: 'tactique' as const,
      avatar: createAvatarForUsername(opponentName, `online-${matchId}`),
      aiDepth: 0,
      aiSkillNoise: 0,
    };
    const moveCount = chess.history().length;
    const xp = computeXpGain({ result, endReason: battle.endReason ?? 'checkmate', winStreak: profile.winStreak + (result === 'win' ? 1 : 0), moveCount, opponentDivisionOrder: opponentProfile.division === profile.division ? 0 : 0 });
    const outcome = applyGameResult({ result, opponentElo: opponentProfile.elo, xpGained: xp.total });
    const newAchievements = unlockAchievements(
      evaluateAchievements({
        result,
        endReason: battle.endReason ?? 'checkmate',
        moveCount,
        winStreakAfter: useProfileStore.getState().profile.winStreak,
        gamesPlayedAfter: useProfileStore.getState().profile.gamesPlayed,
        divisionAfter: useProfileStore.getState().profile.division,
        divisionChangedUp: outcome.divisionChanged,
        didPromotePawn: false,
        checkmateDeliveredByKnight: false,
      }),
    );
    const historyEntryId = `online-game-${Date.now()}`;
    const durationMs = Date.now() - startedAtRef.current;
    let pgn = '';
    try {
      pgn = chess.pgn();
    } catch {
      // Cosmetic only.
    }
    addHistoryEntry({
      id: historyEntryId,
      playedAt: startedAtRef.current,
      durationMs,
      result,
      endReason: battle.endReason ?? 'checkmate',
      playerColor: myColor,
      opponent: opponentProfile,
      eloBefore: outcome.eloBefore,
      eloAfter: outcome.eloAfter,
      xpGained: xp.total,
      pgn,
      finalFen: battle.fen,
      moveCount,
    });
    useMatchStore.getState().setLastResult({
      result,
      endReason: battle.endReason ?? 'checkmate',
      opponent: opponentProfile,
      playerColor: myColor,
      eloBefore: outcome.eloBefore,
      eloAfter: outcome.eloAfter,
      xp,
      divisionChanged: outcome.divisionChanged,
      leveledUp: outcome.leveledUp,
      newAchievements,
      pgn,
      finalFen: battle.fen,
      moveCount,
      durationMs,
      historyEntryId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.status]);

  const isMyTurn = !!(battle && chess && myColor && battle.status === 'active' && chess.turn() === myColor && !promotionPending && !isSpellResolving);

  const legalTargets = useMemo(() => {
    if (!chess || !selectedSquare || armedSpell || !battle || !myColor) return [];
    if (selectedSquare === battle.leapArmed[myColor]) return getLeapDestinations(chess, selectedSquare);
    if (selectedSquare === battle.celesteArmed[myColor]) return getCelesteDestinations(chess, selectedSquare);
    return chess.moves({ square: selectedSquare, verbose: true }).map((m) => m.to);
  }, [chess, selectedSquare, armedSpell, battle, myColor]);

  const spellHighlightTargets = useMemo(() => {
    if (!armedSpell || !chess || !myColor || !otherColor || !battle) return [];
    const squares: Square[] = [];
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r]![f];
        const square = `${FILES[f]}${8 - r}` as Square;
        if (armedSpell === 'piege_invisible') {
          if (!cell && !battle.trapSquares.includes(square)) squares.push(square);
          continue;
        }
        if (!cell) continue;
        if (armedSpell === 'explosion') {
          if (cell.color === myColor && cell.type === 'p') squares.push(square);
        } else if (armedSpell === 'entrave') {
          if (cell.color === otherColor && cell.type !== 'k' && chess.isAttacked(square, myColor)) squares.push(square);
        } else if (armedSpell === 'corruption') {
          if (cell.color === otherColor && cell.type !== 'k' && getOrthogonalAdjacentSquares(square).some((sq) => chess.get(sq)?.color === myColor)) squares.push(square);
        } else if (armedSpell === 'chasseur_de_prime') {
          if (cell.color === otherColor && cell.type !== 'k') squares.push(square);
        } else if (armedSpell === 'echo_du_passe') {
          const previous = battle.previousSquareMap[square];
          if (cell.type !== 'k' && previous && !chess.get(previous)) squares.push(square);
        } else if (armedSpell === 'liaison_funeste') {
          if (spellCastTargets.length === 0) {
            if (cell.color === myColor && cell.type !== 'k') squares.push(square);
          } else if (cell.color === otherColor && cell.type !== 'k' && hasLineOfSight(chess, spellCastTargets[0]!, square)) {
            squares.push(square);
          }
        } else if (armedSpell === 'teleport') {
          if (cell.color === myColor && cell.type !== 'k') squares.push(square);
        } else {
          if (cell.color === myColor && cell.type !== 'k') squares.push(square);
        }
      }
    }
    return squares;
  }, [armedSpell, chess, myColor, otherColor, battle, spellCastTargets]);

  const showSpellFeedback = (message: string) => {
    setSpellFeedbackMessage(message);
    setTimeout(() => setSpellFeedbackMessage(null), 1800);
  };

  const notifyGhostCheck = (reward: number) => {
    setGhostCheckMessage(t('spell.ghostCheckMessage', { gold: reward }));
    setTimeout(() => setGhostCheckMessage(null), 1800);
  };

  const commitMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (!battle || !chess || !myColor) return;
    const working = new Chess(battle.fen);
    let result: Move | null = null;
    try {
      result = working.move({ from, to, promotion });
    } catch {
      return;
    }
    if (!result) return;
    const next = applyMoveToState(
      battle,
      working,
      myColor,
      {
        from: result.from,
        to: result.to,
        capturedType: (result.captured as PieceSymbol | undefined) ?? null,
        isPromotion: Boolean(result.promotion),
        piece: result.piece as PieceSymbol,
        notation: result.san,
      },
      profile.username,
    );
    lastAppliedNotifiedFen.current = next.fen;
    setSelectedSquare(null);
    pushBattle(next);
  };

  const handleSquareTap = (square: Square) => {
    if (!chess || !myColor || !battle) return;
    if (armedSpell) {
      handleSpellTargetTap(square);
      return;
    }
    if (!isMyTurn) return;
    if (selectedSquare && legalTargets.includes(square)) {
      const movingPiece = chess.get(selectedSquare);
      const isLeapMove = selectedSquare === battle.leapArmed[myColor];
      const isCelesteMove = selectedSquare === battle.celesteArmed[myColor];
      const isPromotion = movingPiece?.type === 'p' && (square[1] === '8' || square[1] === '1');
      if (isPromotion) setPromotionPending({ from: selectedSquare, to: square, isLeap: isLeapMove });
      else if (isCelesteMove) applyCelesteMoveAndAdvance(selectedSquare, square);
      else if (isLeapMove) applyLeapMoveAndAdvance(selectedSquare, square);
      else commitMove(selectedSquare, square);
      setSelectedSquare(null);
      return;
    }
    const piece = chess.get(square);
    if (piece && piece.color === myColor) setSelectedSquare(square);
    else setSelectedSquare(null);
  };

  const handlePieceDrop = (from: Square, to: Square) => {
    if (!chess || !myColor || !battle || !isMyTurn || armedSpell) return;
    const piece = chess.get(from);
    if (!piece || piece.color !== myColor) return;
    const isLeapMove = from === battle.leapArmed[myColor];
    const isCelesteMove = from === battle.celesteArmed[myColor];
    const legal = isLeapMove ? getLeapDestinations(chess, from) : isCelesteMove ? getCelesteDestinations(chess, from) : chess.moves({ square: from, verbose: true }).map((m) => m.to);
    if (!legal.includes(to)) return;
    const isPromotion = piece.type === 'p' && (to[1] === '8' || to[1] === '1');
    if (isPromotion) setPromotionPending({ from, to, isLeap: isLeapMove });
    else if (isCelesteMove) applyCelesteMoveAndAdvance(from, to);
    else if (isLeapMove) applyLeapMoveAndAdvance(from, to);
    else commitMove(from, to);
  };

  const applyLeapMoveAndAdvance = (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (!battle || !myColor) return;
    const working = new Chess(battle.fen);
    const promo = promotion && promotion !== 'p' && promotion !== 'k' ? (promotion as 'q' | 'r' | 'b' | 'n') : undefined;
    const movedPiece = working.get(from)?.type ?? 'p';
    const capturedBefore = working.get(to);
    const { captured } = applyLeapMove(working, from, to, promo);
    const next = applyMoveToState(
      battle,
      working,
      myColor,
      { from, to, capturedType: captured && capturedBefore ? capturedBefore.type : null, isPromotion: Boolean(promo), piece: promo ?? movedPiece, notation: `🐴 ${from} → ${to}` },
      profile.username,
    );
    lastAppliedNotifiedFen.current = next.fen;
    pushBattle(next);
  };

  const applyCelesteMoveAndAdvance = (from: Square, to: Square) => {
    if (!battle || !myColor) return;
    const working = new Chess(battle.fen);
    const movedPiece = working.get(from)?.type ?? 'q';
    applyCelesteMove(working, from, to);
    const next = applyMoveToState(battle, working, myColor, { from, to, capturedType: null, isPromotion: false, piece: movedPiece, notation: `✨ ${from} → ${to}` }, profile.username);
    lastAppliedNotifiedFen.current = next.fen;
    pushBattle(next);
  };

  const finishTeleportResolution = (squareA: Square, squareB: Square) => {
    if (!battle || !chess || !myColor) return;
    const working = new Chess(battle.fen);
    const next: OnlineBattleState = structuredClone(battle);
    const remap = (sq: Square | null) => (sq === squareA ? squareB : sq === squareB ? squareA : sq);
    (['w', 'b'] as PieceColor[]).forEach((c) => {
      next.shields[c] = remap(next.shields[c]);
      next.leapArmed[c] = remap(next.leapArmed[c]);
      next.celesteArmed[c] = remap(next.celesteArmed[c]);
      next.resurrectionArmed[c] = remap(next.resurrectionArmed[c]);
      next.entraves[c] = remap(next.entraves[c]);
    });
    if (next.bounty) next.bounty = { ...next.bounty, square: remap(next.bounty.square)! };
    if (next.boundPair) next.boundPair = [remap(next.boundPair[0])!, remap(next.boundPair[1])!];

    next.ownedSpells[myColor] = removeOneSpell(next.ownedSpells[myColor], 'teleport');
    next.hasCastSpellThisTurn[myColor] = true;
    next.gameLog = pushCapped(next.gameLog, { id: `log-${Date.now()}-${Math.random()}`, text: t('game.logSpellCastBetween', { name: profile.username, spell: t(getSpellDef('teleport').nameKey), squareA, squareB }) }, 200);
    triggerTrap(next, working, [squareA, squareB]);
    next.fen = working.fen();
    { const reward = applyGhostCheckIfAny(next, working, myColor); if (reward) notifyGhostCheck(reward); }
    markGameOverIfAny(next, working, otherOf(myColor));
    setArmedSpell(null);
    setSpellCastTargets([]);
    playSfx('spellTeleport');
    haptics.success();
    lastAppliedNotifiedFen.current = next.fen;
    pushBattle(next);
  };

  function removeOneSpell(list: OwnedSpell[], spellId: SpellId): OwnedSpell[] {
    const idx = list.findIndex((s) => s.spellId === spellId);
    if (idx === -1) return list;
    return [...list.slice(0, idx), ...list.slice(idx + 1)];
  }

  const handleSpellTargetTap = (square: Square) => {
    if (!armedSpell || !battle || !chess || !myColor || !otherColor) return;
    const piece = chess.get(square);
    if (piece?.type === 'k') return;

    const consumeAndLog = (next: OnlineBattleState, targets: Square[]) => {
      next.ownedSpells[myColor] = removeOneSpell(next.ownedSpells[myColor], armedSpell);
      next.hasCastSpellThisTurn[myColor] = true;
      const spellName = t(getSpellDef(armedSpell).nameKey);
      const text = targets.length === 0
        ? t('game.logSpellCast', { name: profile.username, spell: spellName })
        : targets.length === 1
          ? t('game.logSpellCastOn', { name: profile.username, spell: spellName, square: targets[0] })
          : t('game.logSpellCastBetween', { name: profile.username, spell: spellName, squareA: targets[0], squareB: targets[1] });
      next.gameLog = pushCapped(next.gameLog, { id: `log-${Date.now()}-${Math.random()}`, text }, 200);
      setArmedSpell(null);
      setSpellCastTargets([]);
    };

    try {
      runTap();
    } catch (error) {
      console.error('[online-game] spell cast failed', error);
      setArmedSpell(null);
      setSpellCastTargets([]);
      setIsSpellResolving(false);
      setExplosionPreviewSquares([]);
      showSpellFeedback(t('spell.castFailed'));
    }

    function runTap() {
      if (!battle || !chess || !myColor || !otherColor) return;
      const working = new Chess(battle.fen);

      if (armedSpell === 'explosion') {
        if (!piece || piece.color !== myColor || piece.type !== 'p') return;
        const blastSquares = getBlastSquares(square);
        setExplosionPreviewSquares(blastSquares);
        setIsSpellResolving(true);
        const next: OnlineBattleState = structuredClone(battle);
        consumeAndLog(next, [square]);
        setTimeout(() => {
          try {
            for (const sq of blastSquares) {
              const victim = working.get(sq);
              if (victim && victim.type !== 'k') next.deadAllies[victim.color].push(victim.type);
            }
            const { destroyedSquares } = applyExplosion(working, square);
            const extra = reactToDestructionState(next, working, destroyedSquares);
            invalidateStale(next, [...destroyedSquares, ...extra]);
            next.fen = working.fen();
            { const reward = applyGhostCheckIfAny(next, working, myColor); if (reward) notifyGhostCheck(reward); }
            markGameOverIfAny(next, working, otherColor);
            playSfx('spellExplosion');
            haptics.capture();
            lastAppliedNotifiedFen.current = next.fen;
            pushBattle(next);
          } catch (error) {
            console.error('[online-game] explosion resolution failed', error);
            showSpellFeedback(t('spell.castFailed'));
          } finally {
            setExplosionPreviewSquares([]);
            setIsSpellResolving(false);
          }
        }, 450);
        return;
      }

      if (armedSpell === 'teleport') {
        if (!piece || piece.color !== myColor || piece.type === 'k') return;
        if (spellCastTargets.length === 0) {
          setSpellCastTargets([square]);
          return;
        }
        const first = spellCastTargets[0]!;
        if (first === square) return;
        if (wouldTeleportStrandPawn(working, first, square)) return;
        const promotionSquare = getTeleportPromotionSquare(working, first, square);
        if (promotionSquare) {
          const pawnSquare = promotionSquare === first ? square : first;
          setPromotionPending({ from: pawnSquare, to: promotionSquare, isTeleport: true });
          setSpellCastTargets([first, square]);
          return;
        }
        applyTeleport(working, first, square);
        finishTeleportResolution(first, square);
        return;
      }

      if (armedSpell === 'shield') {
        if (!piece || piece.color !== myColor || piece.type === 'k') return;
        const next: OnlineBattleState = structuredClone(battle);
        next.shields[myColor] = square;
        consumeAndLog(next, [square]);
        playSfx('spellShield');
        haptics.success();
        pushBattle(next);
        return;
      }

      if (armedSpell === 'leap') {
        if (!piece || piece.color !== myColor || piece.type === 'k') return;
        const next: OnlineBattleState = structuredClone(battle);
        next.leapArmed[myColor] = square;
        consumeAndLog(next, [square]);
        playSfx('spellLeap');
        haptics.success();
        pushBattle(next);
        return;
      }

      if (armedSpell === 'celeste') {
        if (!piece || piece.color !== myColor || piece.type === 'k') return;
        const next: OnlineBattleState = structuredClone(battle);
        next.celesteArmed[myColor] = square;
        consumeAndLog(next, [square]);
        playSfx('spellLeap');
        haptics.success();
        pushBattle(next);
        return;
      }

      if (armedSpell === 'resurrection') {
        if (!piece || piece.color !== myColor || piece.type === 'k') return;
        const next: OnlineBattleState = structuredClone(battle);
        next.resurrectionArmed[myColor] = square;
        consumeAndLog(next, [square]);
        playSfx('spellShield');
        haptics.success();
        pushBattle(next);
        return;
      }

      if (armedSpell === 'entrave') {
        if (!piece || piece.color !== otherColor || piece.type === 'k') return;
        if (!working.isAttacked(square, myColor)) return;
        const next: OnlineBattleState = structuredClone(battle);
        next.entraves[myColor] = square;
        consumeAndLog(next, [square]);
        playSfx('spellShield');
        haptics.success();
        pushBattle(next);
        return;
      }

      if (armedSpell === 'corruption') {
        if (!piece || piece.color !== otherColor || piece.type === 'k') return;
        const isAdjacentToAlly = getOrthogonalAdjacentSquares(square).some((sq) => working.get(sq)?.color === myColor);
        if (!isAdjacentToAlly) return;
        applyCorruption(working, square, myColor);
        const next: OnlineBattleState = structuredClone(battle);
        invalidateStale(next, [square]);
        consumeAndLog(next, [square]);
        next.fen = working.fen();
        { const reward = applyGhostCheckIfAny(next, working, myColor); if (reward) notifyGhostCheck(reward); }
        markGameOverIfAny(next, working, otherColor);
        playSfx('spellTeleport');
        haptics.success();
        pushBattle(next);
        return;
      }

      if (armedSpell === 'prix_du_sang') {
        if (!piece || piece.color !== myColor || piece.type === 'k') return;
        const value = CAPTURE_GOLD_VALUE[piece.type];
        working.remove(square);
        const next: OnlineBattleState = structuredClone(battle);
        const extra = reactToDestructionState(next, working, [square]);
        invalidateStale(next, [square, ...extra]);
        next.gold[myColor] += value;
        consumeAndLog(next, [square]);
        next.fen = working.fen();
        { const reward = applyGhostCheckIfAny(next, working, myColor); if (reward) notifyGhostCheck(reward); }
        markGameOverIfAny(next, working, otherColor);
        playSfx('spellExplosion');
        haptics.success();
        pushBattle(next);
        return;
      }

      if (armedSpell === 'piege_invisible') {
        if (piece || battle.trapSquares.includes(square)) return;
        const next: OnlineBattleState = structuredClone(battle);
        next.trapSquares = [...next.trapSquares, square];
        consumeAndLog(next, [square]);
        playSfx('spellShield');
        haptics.success();
        pushBattle(next);
        return;
      }

      if (armedSpell === 'echo_du_passe') {
        if (!piece || piece.type === 'k') return;
        const previous = battle.previousSquareMap[square];
        if (!previous || working.get(previous)) return;
        applyEchoOfThePast(working, square, previous);
        const next: OnlineBattleState = structuredClone(battle);
        invalidateStale(next, [square]);
        consumeAndLog(next, [square]);
        triggerTrap(next, working, [previous]);
        next.fen = working.fen();
        { const reward = applyGhostCheckIfAny(next, working, myColor); if (reward) notifyGhostCheck(reward); }
        markGameOverIfAny(next, working, otherColor);
        playSfx('spellTeleport');
        haptics.success();
        pushBattle(next);
        return;
      }

      if (armedSpell === 'chasseur_de_prime') {
        if (!piece || piece.color !== otherColor || piece.type === 'k') return;
        const next: OnlineBattleState = structuredClone(battle);
        next.bounty = { square, ownerColor: myColor };
        consumeAndLog(next, [square]);
        playSfx('spellShield');
        haptics.success();
        pushBattle(next);
        return;
      }

      if (armedSpell === 'liaison_funeste') {
        if (spellCastTargets.length === 0) {
          if (!piece || piece.color !== myColor || piece.type === 'k') return;
          setSpellCastTargets([square]);
          return;
        }
        const allySquare = spellCastTargets[0]!;
        if (!piece || piece.color !== otherColor || piece.type === 'k') return;
        if (!hasLineOfSight(working, allySquare, square)) return;
        const next: OnlineBattleState = structuredClone(battle);
        next.boundPair = [allySquare, square];
        consumeAndLog(next, [allySquare, square]);
        playSfx('spellTeleport');
        haptics.success();
        pushBattle(next);
      }
    }
  };

  const handlePromotionSelect = (piece: PieceSymbol) => {
    if (!promotionPending || !battle || !myColor) return;
    if (promotionPending.isTeleport) {
      const working = new Chess(battle.fen);
      applyTeleportWithPromotion(working, promotionPending.from, promotionPending.to, piece as 'q' | 'r' | 'b' | 'n');
      setPromotionPending(null);
      finishTeleportResolutionAfterPromotion(working, promotionPending.from, promotionPending.to);
      return;
    }
    if (promotionPending.isLeap) {
      const { from, to } = promotionPending;
      setPromotionPending(null);
      applyLeapMoveAndAdvance(from, to, piece);
      return;
    }
    commitMove(promotionPending.from, promotionPending.to, piece);
    setPromotionPending(null);
  };

  const finishTeleportResolutionAfterPromotion = (working: Chess, squareA: Square, squareB: Square) => {
    if (!battle || !myColor) return;
    const next: OnlineBattleState = structuredClone(battle);
    const remap = (sq: Square | null) => (sq === squareA ? squareB : sq === squareB ? squareA : sq);
    (['w', 'b'] as PieceColor[]).forEach((c) => {
      next.shields[c] = remap(next.shields[c]);
      next.leapArmed[c] = remap(next.leapArmed[c]);
      next.celesteArmed[c] = remap(next.celesteArmed[c]);
      next.resurrectionArmed[c] = remap(next.resurrectionArmed[c]);
      next.entraves[c] = remap(next.entraves[c]);
    });
    next.ownedSpells[myColor] = removeOneSpell(next.ownedSpells[myColor], 'teleport');
    next.hasCastSpellThisTurn[myColor] = true;
    setArmedSpell(null);
    setSpellCastTargets([]);
    triggerTrap(next, working, [squareA, squareB]);
    next.fen = working.fen();
    { const reward = applyGhostCheckIfAny(next, working, myColor); if (reward) notifyGhostCheck(reward); }
    markGameOverIfAny(next, working, otherOf(myColor));
    playSfx('spellTeleport');
    haptics.success();
    pushBattle(next);
  };

  const handleBuySpell = (spellId: SpellId) => {
    if (!battle || !myColor) return;
    const def = getSpellDef(spellId);
    if (battle.gold[myColor] < def.cost) return;
    if (battle.ownedSpells[myColor].some((s) => s.spellId === spellId)) return;
    if (battle.ownedSpells[myColor].length >= MAX_OWNED_SPELLS) return;
    const next: OnlineBattleState = structuredClone(battle);
    next.gold[myColor] -= def.cost;
    next.ownedSpells[myColor] = [...next.ownedSpells[myColor], { instanceId: `${spellId}-${Date.now()}-${Math.random()}`, spellId, boughtThisTurn: true }];
    playSfx('spellBuy');
    haptics.success();
    pushBattle(next);
  };

  const handleInstantSpellCast = (spellId: SpellId) => {
    if (!battle || !myColor || !otherColor) return;
    const next: OnlineBattleState = structuredClone(battle);
    const consume = (targets: Square[]) => {
      next.ownedSpells[myColor] = removeOneSpell(next.ownedSpells[myColor], spellId);
      next.hasCastSpellThisTurn[myColor] = true;
      const spellName = t(getSpellDef(spellId).nameKey);
      next.gameLog = pushCapped(next.gameLog, { id: `log-${Date.now()}-${Math.random()}`, text: t('game.logSpellCast', { name: profile.username, spell: spellName }) }, 200);
    };
    if (spellId === 'oeil_pour_oeil') {
      consume([]);
      next.gold = { w: 0, b: 0 };
      playSfx('gold');
      haptics.success();
      pushBattle(next);
      return;
    }
    if (spellId === 'camouflage') {
      consume([]);
      next.camouflage[myColor] = true;
      playSfx('spellShield');
      haptics.success();
      pushBattle(next);
      return;
    }
    if (spellId === 'silencium') {
      consume([]);
      next.silenced[otherColor] = true;
      playSfx('spellShield');
      haptics.success();
      pushBattle(next);
      return;
    }
    if (spellId === 'reflexion') {
      showSpellFeedback(t('spell.nothingToReflect'));
      return;
    }
  };

  const handleArmSpell = (spellId: SpellId) => {
    if (!battle || !myColor || !isMyTurn) return;
    if (armedSpell === spellId) {
      setArmedSpell(null);
      setSpellCastTargets([]);
      return;
    }
    if (battle.hasCastSpellThisTurn[myColor]) {
      showSpellFeedback(t('spell.oneSpellPerTurn'));
      return;
    }
    if (battle.ownedSpells[myColor].find((s) => s.spellId === spellId)?.boughtThisTurn) {
      showSpellFeedback(t('spell.boughtThisTurnMessage'));
      return;
    }
    if (battle.silenced[myColor]) {
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
  };

  const handleResign = () => {
    if (!battle || !myColor) return;
    setResignConfirmOpen(false);
    const next: OnlineBattleState = structuredClone(battle);
    next.status = 'finished';
    next.winner = otherOf(myColor) === 'w' ? 'white' : 'black';
    next.endReason = 'resignation';
    pushBattle(next);
  };

  const handleSendChat = (text: string) => {
    if (!battle || !text.trim()) return;
    const next: OnlineBattleState = structuredClone(battle);
    next.chat = pushCapped(next.chat, { id: `chat-${Date.now()}-${Math.random()}`, from: 'player', text: `${profile.username}: ${text.trim()}` }, 100);
    pushBattle(next);
  };

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isCompact = windowWidth < 500;
  const sidePanelWidth = isCompact
    ? Math.round(Math.min(120, Math.max(84, windowWidth * 0.22)))
    : Math.round(Math.min(300, Math.max(170, windowWidth * 0.19)));
  const boardSize = useMemo(() => {
    const rowGap = spacing.xs * 2;
    const availableWidth = windowWidth - spacing.md * 2 - sidePanelWidth * 2 - rowGap;
    const availableHeight = windowHeight * 0.68;
    return Math.max(140, Math.min(availableWidth, availableHeight, 760));
  }, [windowWidth, windowHeight, sidePanelWidth]);

  if (loadError) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.center}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable onPress={() => router.replace('/home')} style={styles.backToHome}>
            <Text style={styles.backToHomeText}>{t('common.back')}</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  if (!battle || !chess || !myColor || !otherColor) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator color={palette.violetBright} />
        </SafeAreaView>
      </View>
    );
  }

  const checkSquare = chess.inCheck() ? findKingSquare(chess, chess.turn()) : null;
  const missingMine = getMissingPieces(chess, myColor);
  const missingOpp = getMissingPieces(chess, otherColor);
  const materialLost = (missing: PieceSymbol[]) => missing.reduce((sum, type) => sum + STANDARD_PIECE_VALUE[type], 0);
  const myAdvantage = Math.max(0, materialLost(missingOpp) - materialLost(missingMine));
  const oppAdvantage = Math.max(0, materialLost(missingMine) - materialLost(missingOpp));
  const disguisedSquares = battle.camouflage[otherColor]
    ? chess.board().flat().filter((c): c is NonNullable<typeof c> => !!c && c.color === otherColor && c.type !== 'p').map((c) => c.square)
    : [];

  const gameOverReasonLabel =
    battle.status === 'finished'
      ? battle.endReason === 'checkmate'
        ? t(battle.winner === (myColor === 'w' ? 'white' : 'black') ? 'game.gameOverCheckmateWin' : 'game.gameOverCheckmateLoss')
        : battle.endReason === 'resignation'
          ? t('game.gameOverResignation')
          : t('game.gameOverDraw')
      : '';
  const myResult: GameResultKind = battle.winner === 'draw' ? 'draw' : battle.winner === (myColor === 'w' ? 'white' : 'black') ? 'win' : 'loss';

  // Same orientation logic as the local game screen — the settings-wide board-orientation
  // preference applies here too, with the manual flip button overriding it for this match only.
  const orientation: 'white' | 'black' = flipped
    ? myColor === 'w' ? 'black' : 'white'
    : settings.boardOrientation === 'black'
      ? 'black'
      : settings.boardOrientation === 'white'
        ? 'white'
        : myColor === 'w'
          ? 'white'
          : 'black';
  const topColor: PieceColor = orientation === 'white' ? otherColor : myColor;
  const bottomColor: PieceColor = orientation === 'white' ? myColor : otherColor;
  const topIsOpponent = topColor !== myColor;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <PlayerBar
          isOpponent={topIsOpponent}
          opponentName={opponentName}
          myProfile={profile}
          color={topColor}
          active={chess.turn() === topColor}
          missingPieces={topColor === myColor ? missingMine : missingOpp}
          advantage={topColor === myColor ? myAdvantage : oppAdvantage}
        />

        <View style={styles.middleRow}>
          <LeftGamePanel
            width={sidePanelWidth}
            messages={battle.chat}
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
            logEntries={battle.gameLog}
          />

          <View style={styles.center}>
            <View style={[styles.boardStage, { width: boardSize, height: boardSize }]}>
              <View style={styles.statusArea}>
                {ghostCheckMessage && <Text style={styles.ghostCheckBanner}>{ghostCheckMessage}</Text>}
                {chess.inCheck() && battle.status === 'active' && <Text style={styles.checkBanner}>{t('game.check')}</Text>}
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
              </View>

              <View style={styles.boardWrap}>
                <ChessBoard
                  fen={battle.fen}
                  orientation={orientation}
                  size={boardSize}
                  boardTheme={boardTheme}
                  pieceTheme={pieceTheme}
                  selectedSquare={armedSpell ? (spellCastTargets[0] ?? null) : selectedSquare}
                  legalTargets={armedSpell ? spellHighlightTargets : legalTargets}
                  lastMove={battle.lastMove}
                  checkSquare={checkSquare}
                  dangerSquares={explosionPreviewSquares}
                  trapSquares={battle.trapSquares}
                  disguisedSquares={disguisedSquares}
                  interactive={isMyTurn || !!armedSpell}
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
            gold={battle.gold[myColor]}
            ownedSpells={battle.ownedSpells[myColor]}
            aiOwnedSpells={battle.ownedSpells[otherColor]}
            armedSpell={armedSpell}
            castingDisabled={battle.hasCastSpellThisTurn[myColor]}
            onArm={handleArmSpell}
            onBuy={handleBuySpell}
          />
        </View>

        <PlayerBar
          isOpponent={!topIsOpponent}
          opponentName={opponentName}
          myProfile={profile}
          color={bottomColor}
          active={chess.turn() === bottomColor}
          missingPieces={bottomColor === myColor ? missingMine : missingOpp}
          advantage={bottomColor === myColor ? myAdvantage : oppAdvantage}
        />

        <View style={styles.actionsRow}>
          <ActionButton label={t('game.flipBoard')} icon="⇅" onPress={() => setFlipped((f) => !f)} />
          <ActionButton label={t('game.resign')} icon="🏳" onPress={() => setResignConfirmOpen(true)} danger disabled={battle.status === 'finished'} />
        </View>
      </SafeAreaView>

      <PromotionModal visible={!!promotionPending} color={myColor} pieceTheme={pieceTheme} onSelect={handlePromotionSelect} />
      <ConfirmModal
        visible={resignConfirmOpen}
        title={t('game.resignConfirmTitle')}
        body={t('game.resignConfirmBody')}
        confirmLabel={t('game.resign')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleResign}
        onCancel={() => setResignConfirmOpen(false)}
      />
      <GameOverPanel
        visible={battle.status === 'finished'}
        result={myResult}
        reasonLabel={gameOverReasonLabel}
        onViewResult={() => router.replace('/result')}
        onQuit={() => router.replace('/home')}
        viewResultLabel={t('game.viewResult')}
        quitLabel={t('common.close')}
      />
    </View>
  );
}

function PlayerBar({
  isOpponent,
  opponentName,
  myProfile,
  color,
  active,
  missingPieces,
  advantage,
}: {
  isOpponent: boolean;
  opponentName: string;
  myProfile: { username: string; avatar: ReturnType<typeof createAvatarForUsername>; photoUri?: string };
  color: PieceColor;
  active: boolean;
  missingPieces: PieceSymbol[];
  advantage: number;
}) {
  return (
    <View style={styles.playerBar}>
      <View style={styles.playerInfo}>
        {isOpponent ? (
          <Avatar avatar={createAvatarForUsername(opponentName, opponentName)} size={36} />
        ) : (
          <Avatar avatar={myProfile.avatar} photoUri={myProfile.photoUri} size={36} />
        )}
        <View style={styles.playerNameCol}>
          <Text style={styles.playerName} numberOfLines={1}>
            {isOpponent ? opponentName : myProfile.username}
          </Text>
          <CapturedPieces missingPieces={missingPieces} advantage={advantage} />
        </View>
        <Text style={styles.playerColorDot}>{color === 'w' ? '♔' : '♚'}</Text>
      </View>
      <View style={[styles.clock, active && styles.clockActive]}>
        <Text style={[styles.clockText, active && styles.clockTextActive]}>∞</Text>
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
  root: { flex: 1, backgroundColor: palette.voidBlack },
  safeArea: { flex: 1, paddingHorizontal: spacing.md, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  middleRow: { flex: 1, flexDirection: 'row', gap: spacing.xs },
  boardStage: { position: 'relative' },
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
  checkBanner: { color: palette.danger, fontFamily: fontFamily.display, fontSize: fontSize.lg },
  ghostCheckBanner: { color: palette.goldBright, fontFamily: fontFamily.display, fontSize: fontSize.md },
  statusText: { color: palette.ivoryMuted, fontSize: fontSize.sm, textAlign: 'center' },
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
  cancelSpellLabel: { color: palette.danger, fontSize: fontSize.sm, fontWeight: '600' },
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
  playerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  playerNameCol: { flexShrink: 1, gap: 1 },
  playerName: { color: palette.ivory, fontWeight: '600', flexShrink: 1 },
  playerColorDot: { color: palette.ivoryFaint, fontSize: fontSize.sm },
  clock: {
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    minWidth: 64,
    alignItems: 'center',
  },
  clockActive: { backgroundColor: palette.gold },
  clockText: { color: palette.ivory, fontFamily: fontFamily.mono, fontWeight: '700' },
  clockTextActive: { color: palette.voidBlack },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm },
  actionButton: { alignItems: 'center', gap: 2, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, minWidth: 80 },
  actionButtonPressed: { opacity: 0.6 },
  actionButtonDisabled: { opacity: 0.35 },
  actionIcon: { fontSize: 22, color: palette.ivoryMuted },
  actionLabel: { fontSize: fontSize.xs, color: palette.ivoryFaint },
  errorText: { color: palette.danger, fontSize: fontSize.md, textAlign: 'center', paddingHorizontal: spacing.lg },
  backToHome: { marginTop: spacing.md, alignSelf: 'center' },
  backToHomeText: { color: palette.violetBright, fontWeight: '700' },
});
