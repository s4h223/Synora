import { extractProblemFromDom } from '@/lib/leetcode/dom';
import { fetchQuestion, LeetCodeApiError, readCsrfToken } from '@/lib/leetcode/graphql';
import type { ContentRequest, GetProblemResponse, Problem } from '@/lib/leetcode/types';
import { classifyUrl } from '@/lib/leetcode/url';

/**
 * Deliberately tiny: no observers, no polling, no DOM mutation. It only answers
 * requests from the side panel. Navigation is tracked by the side panel through
 * chrome.tabs events, so this script does nothing until asked.
 */
export default defineContentScript({
  matches: ['https://leetcode.com/*'],
  // Never active on contest pages.
  excludeMatches: ['https://leetcode.com/contest/*'],
  runAt: 'document_idle',
  main() {
    const cache = new Map<string, Problem>();

    browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
      if (!isContentRequest(message)) return false;
      getProblem(cache).then(sendResponse);
      return true; // keep the channel open for the async response
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
