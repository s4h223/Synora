import { extractProblemFromDom } from '@/lib/leetcode/dom';
import { fetchQuestion, LeetCodeApiError, readCsrfToken } from '@/lib/leetcode/graphql';
import {
  LIVE_MARKER,
  type LiveCodeMessage,
  type LiveHoverMessage,
  liveHoverSchema,
  liveSnapshotSchema,
} from '@/lib/leetcode/live-sync';
import type { ContentRequest, GetProblemResponse, Problem } from '@/lib/leetcode/types';
import { classifyUrl } from '@/lib/leetcode/url';

/**
 * Deliberately tiny: no observers, no polling, no DOM mutation. It answers
 * problem requests from the side panel and relays live-code snapshots posted by
 * the MAIN-world editor watcher (only installed when the user enables Live).
 */
export default defineContentScript({
  matches: ['https://leetcode.com/*'],
  // Never active on contest pages.
  excludeMatches: ['https://leetcode.com/contest/*'],
  runAt: 'document_idle',
  main(ctx) {
    const cache = new Map<string, Problem>();

    browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
      if (!isContentRequest(message)) return false;
      getProblem(cache).then(sendResponse);
      return true; // keep the channel open for the async response
    });

    ctx.addEventListener(window, 'message', (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin) return;
      const data = event.data as Record<string, unknown> | null;
      if (data?.[LIVE_MARKER] !== true) return;

      const info = classifyUrl(location.href);
      if (info.kind !== 'problem') return;

      let message: LiveCodeMessage | LiveHoverMessage | null = null;
      const snapshot = liveSnapshotSchema.safeParse(data.snapshot);
      const hover = liveHoverSchema.safeParse(data.hover);
      if (snapshot.success) {
        message = { type: 'synora:live-code', slug: info.slug, snapshot: snapshot.data };
      } else if (hover.success) {
        message = { type: 'synora:live-hover', slug: info.slug, hover: hover.data };
      }
      // Rejects when the side panel is closed; that's fine.
      if (message) browser.runtime.sendMessage(message).catch(() => {});
    });
  },
});

function isContentRequest(message: unknown): message is ContentRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'synora:get-problem'
  );
}

async function getProblem(cache: Map<string, Problem>): Promise<GetProblemResponse> {
  const info = classifyUrl(location.href);
  if (info.kind !== 'problem') return { ok: false, reason: 'not-problem-page' };

  const cached = cache.get(info.slug);
  if (cached) return { ok: true, problem: cached };

  try {
    const problem = await fetchQuestion(info.slug, fetch, readCsrfToken(document.cookie));
    if (!problem) return { ok: false, reason: 'not-found' };
    cache.set(info.slug, problem);
    return { ok: true, problem };
  } catch (error) {
    const fallback = extractProblemFromDom(document, info.slug);
    if (fallback) return { ok: true, problem: fallback };
    return {
      ok: false,
      reason: 'fetch-failed',
      message: error instanceof LeetCodeApiError ? error.message : 'Could not load problem',
    };
  }
}
