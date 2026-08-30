import { Platform } from 'react-native';
import type { SearchOptions, SearchResult } from '@/engine/search';

/**
 * Runs the AI search on a real background thread via Expo Metro's experimental web Worker
 * support, so it can never block the main thread — the actual fix for the "AI move freezes the
 * board" lag (the previous fix, periodic yielding in `search.ts`, only shortened the freezes; this
 * removes them). Web-only: Metro's Worker bundling doesn't exist on native, and there `findBestMove`
 * is called directly on the main thread instead (see `aiPlayer.ts`) — no regression there since
 * that's exactly what already shipped.
 *
 * One worker is created lazily and reused for the whole session (spinning up a fresh OS thread and
 * re-fetching the worker's bundle on every single move would be far slower than the search itself
 * for the fast/shallow bots). Multiple in-flight requests are fine — the worker's own JS thread
 * processes `postMessage` calls one at a time in order, matched back to their caller by `id`,
 * mirroring the same "ignore a stale response" pattern `game.tsx` already used for the main-thread
 * search.
 */

let worker: Worker | null = null;
let nextRequestId = 0;
const pending = new Map<number, { resolve: (result: SearchResult) => void; reject: (error: unknown) => void }>();

type WorkerResponse = { id: number; result: SearchResult } | { id: number; error: string };

function getWorker(): Worker {
  if (worker) return worker;
  // `new URL(..., window.location.href)`, not `import.meta.url` — the latter isn't confirmed
  // supported by Metro's worker bundling, per Expo's own docs for this pattern.
  const created = new Worker(new URL('./search.worker.ts', window.location.href));
  created.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const entry = pending.get(event.data.id);
    if (!entry) return;
    pending.delete(event.data.id);
    if ('error' in event.data) entry.reject(new Error(event.data.error));
    else entry.resolve(event.data.result);
  };
  created.onerror = (event) => {
    // A worker-level failure (e.g. the split bundle failed to load) has no `id` to route to a
    // specific caller — reject everything in flight so `aiPlayer.ts`'s fallback can kick in
    // instead of leaving those requests hanging forever.
    const error = new Error(event.message || 'AI search worker crashed');
    for (const entry of pending.values()) entry.reject(error);
    pending.clear();
  };
  worker = created;
  return created;
}

/** True only on web, where Expo Metro can actually bundle/load a Worker. */
export function isSearchWorkerSupported(): boolean {
  return Platform.OS === 'web' && typeof Worker !== 'undefined';
}

export function findBestMoveInWorker(fen: string, options: SearchOptions): Promise<SearchResult> {
  const w = getWorker();
  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, fen, options });
  });
}
