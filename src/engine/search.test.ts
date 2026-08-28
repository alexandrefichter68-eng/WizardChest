import { Chess } from 'chess.js';
import { findBestMove } from '@/engine/search';

describe('search engine', () => {
  it('always returns a legal move from the starting position', async () => {
    const chess = new Chess();
    const result = await findBestMove(chess, { maxDepth: 2, timeBudgetMs: 1000 });
    const legalMoves = chess.moves({ verbose: true }).map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
    const chosen = `${result.bestMove.from}${result.bestMove.to}${result.bestMove.promotion ?? ''}`;
    expect(legalMoves).toContain(chosen);
  });

  it('does not mutate the board it was given (move/undo balance)', async () => {
    const chess = new Chess();
    const fenBefore = chess.fen();
    await findBestMove(chess, { maxDepth: 2, timeBudgetMs: 1000 });
    expect(chess.fen()).toBe(fenBefore);
  });

  it('finds a mate-in-1 when one is available', async () => {
    // White rook on a1, black king boxed in on g8 by its own pawns: Ra8# is mate in one.
    const mateInOne = new Chess('6k1/5ppp/8/8/8/8/8/R6K w - - 0 1');
    const result = await findBestMove(mateInOne, { maxDepth: 3, timeBudgetMs: 1500 });
    mateInOne.move({ from: result.bestMove.from, to: result.bestMove.to, promotion: result.bestMove.promotion });
    expect(mateInOne.isCheckmate()).toBe(true);
  });

  it('prefers not to lose material for nothing (avoids hanging the queen)', async () => {
    // White queen on d1 can capture a pawn on d7 but would be captured back by the king for free;
    // a reasonable engine should not choose that over safer developing/central moves at this depth.
    const chess = new Chess('4k3/3p4/8/8/8/8/8/3QK3 w - - 0 1');
    const result = await findBestMove(chess, { maxDepth: 3, timeBudgetMs: 1500 });
    expect(`${result.bestMove.from}${result.bestMove.to}`).not.toBe('d1d7');
  });

  it('respects the configured search depth ceiling (does not throw for depth 1)', async () => {
    const chess = new Chess();
    const result = await findBestMove(chess, { maxDepth: 1, timeBudgetMs: 500 });
    expect(result.depthReached).toBeGreaterThanOrEqual(1);
  });

  it('throws when given a position with no legal moves', async () => {
    const checkmated = new Chess('6k1/6Q1/6K1/8/8/8/8/8 b - - 0 1');
    expect(checkmated.isCheckmate()).toBe(true);
    await expect(findBestMove(checkmated, { maxDepth: 2, timeBudgetMs: 500 })).rejects.toThrow();
  });
});
