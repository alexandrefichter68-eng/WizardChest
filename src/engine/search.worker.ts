import { Chess } from 'chess.js';
import { findBestMove, type SearchOptions, type SearchResult } from '@/engine/search';

/**
 * Web-only Worker entry point (see `searchWorkerClient.ts` — this is the "real" fix for the AI
 * lag: the search now runs on a separate OS thread instead of yielding on the main one, so the UI
 * genuinely never freezes, not just "freezes less often". Only ever imported dynamically, and only
 * on web (Expo Metro's Worker bundling is web-only), so `self` here is a `DedicatedWorkerGlobalScope`
 * at runtime — typed narrowly instead of pulling in the `webworker` lib, which conflicts with the
 * `DOM` lib already loaded project-wide (both declare incompatible globals under the same names).
 */
declare const self: {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse) => void;
};

interface WorkerRequest {
  id: number;
  fen: string;
  options: SearchOptions;
}

type WorkerResponse = { id: number; result: SearchResult } | { id: number; error: string };

self.onmessage = (event) => {
  const { id, fen, options } = event.data;
  findBestMove(new Chess(fen), options)
    .then((result) => self.postMessage({ id, result }))
    .catch((error: unknown) => self.postMessage({ id, error: error instanceof Error ? error.message : String(error) }));
};
