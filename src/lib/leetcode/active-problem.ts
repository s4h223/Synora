import type { GetProblemResponse, Problem } from './types';
import { classifyUrl } from './url';

export type ProblemState =
  | { status: 'idle' }
  | { status: 'no-problem'; reason: 'not-leetcode' | 'other-leetcode' | 'contest' }
  | { status: 'loading'; slug: string; tabId: number }
  | { status: 'ready'; problem: Problem; tabId: number }
  /** The tab's content script is unreachable even after re-injection. */
  | { status: 'disconnected'; slug: string; tabId: number }
  | { status: 'error'; slug: string; tabId: number; message: string };

export interface TabLike {
  id?: number;
  url?: string;
}

export interface ProblemResolverDeps {
  /** Ask the tab's content script for problem data. Rejects if no content script is listening. */
  requestProblem(tabId: number): Promise<GetProblemResponse>;
  /** Inject the content script (e.g. into tabs opened before Synora was installed). */
  injectContentScript(tabId: number): Promise<void>;
}

/** Work out what the side panel should show for a tab. */
export async function resolveProblemState(
  tab: TabLike | undefined,
  deps: ProblemResolverDeps,
): Promise<ProblemState> {
  const info = classifyUrl(tab?.url);
  if (info.kind !== 'problem' || tab?.id === undefined) {
    return { status: 'no-problem', reason: info.kind === 'problem' ? 'not-leetcode' : info.kind };
  }
  const tabId = tab.id;

  let response: GetProblemResponse;
  try {
    response = await deps.requestProblem(tabId);
  } catch {
    try {
      await deps.injectContentScript(tabId);
      response = await deps.requestProblem(tabId);
    } catch {
      return { status: 'disconnected', slug: info.slug, tabId };
    }
  }

  if (response.ok) return { status: 'ready', problem: response.problem, tabId };

  switch (response.reason) {
    case 'not-problem-page':
      return { status: 'no-problem', reason: 'other-leetcode' };
    case 'not-found':
      return {
        status: 'error',
        slug: info.slug,
        tabId,
        message: 'LeetCode has no problem at this URL.',
      };
    case 'fetch-failed':
      return {
        status: 'error',
        slug: info.slug,
        tabId,
        message: response.message ?? 'Could not load problem details.',
      };
  }
}

/** The slug the state refers to, if any. */
export function stateSlug(state: ProblemState): string | null {
  switch (state.status) {
    case 'ready':
      return state.problem.slug;
    case 'loading':
    case 'disconnected':
    case 'error':
      return state.slug;
    default:
      return null;
  }
}
