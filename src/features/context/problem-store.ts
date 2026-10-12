import { create } from 'zustand';
import { recordProblemOpened } from '@/lib/db/repository';
import { db } from '@/lib/db/schema';
import {
  type ProblemResolverDeps,
  type ProblemState,
  resolveProblemState,
  type TabLike,
} from '@/lib/leetcode/active-problem';
import { browserProblemDeps } from '@/lib/leetcode/browser-bridge';
import { classifyUrl } from '@/lib/leetcode/url';
import { getSettings } from '@/lib/settings';

interface ProblemStore {
  state: ProblemState;
  /** Re-resolve the active tab. `force` bypasses the "same problem already loaded" shortcut. */
  refresh(options?: { force?: boolean }): Promise<void>;
}

export function createProblemStore(
  getActiveTab: () => Promise<TabLike | undefined>,
  deps: ProblemResolverDeps,
  onReady: (state: Extract<ProblemState, { status: 'ready' }>) => void = () => {},
) {
  let requestSeq = 0;
  return create<ProblemStore>((set, get) => ({
    state: { status: 'idle' },
    async refresh({ force = false } = {}) {
      const tab = await getActiveTab();
      const info = classifyUrl(tab?.url);
      const current = get().state;

      // Same problem in the same tab is already loaded: nothing to do.
      if (
        !force &&
        info.kind === 'problem' &&
        current.status === 'ready' &&
        current.tabId === tab?.id &&
        current.problem.slug === info.slug
      ) {
        return;
      }

      const seq = ++requestSeq;
      if (info.kind === 'problem' && tab?.id !== undefined) {
        set({ state: { status: 'loading', slug: info.slug, tabId: tab.id } });
      }

      const next = await resolveProblemState(tab, deps);
      if (seq !== requestSeq) return; // a newer navigation superseded this one
      set({ state: next });
      if (next.status === 'ready') onReady(next);
    },
  }));
}

async function getActiveTab(): Promise<TabLike | undefined> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function logOpened(state: Extract<ProblemState, { status: 'ready' }>) {
  try {
    if ((await getSettings()).sessionTracking) await recordProblemOpened(db, state.problem);
  } catch (error) {
    console.error('Synora: failed to record problem_opened', error);
  }
}

export const useProblemStore = createProblemStore(getActiveTab, browserProblemDeps, logOpened);

/**
 * Follow the active tab of this panel's window (each window has its own panel):
 * tab switches, client-side navigation (LeetCode is an SPA; pushState surfaces
 * as tabs.onUpdated with a `url`), and page reloads.
 * Returns an unsubscribe function.
 */
export function watchActiveTab(): () => void {
  const { refresh } = useProblemStore.getState();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debouncedRefresh = (force = false) => {
    clearTimeout(timer);
    timer = setTimeout(() => void refresh({ force }), 150);
  };

  const onActivated = () => debouncedRefresh();
  const onUpdated = (
    _tabId: number,
    change: { url?: string; status?: string },
    tab: { active?: boolean },
  ) => {
    if (!tab.active) return;
    if (change.url) debouncedRefresh();
    // A full reload replaces the content script, so re-fetch once loading completes.
    else if (change.status === 'complete') debouncedRefresh(true);
  };

  browser.tabs.onActivated.addListener(onActivated);
  browser.tabs.onUpdated.addListener(onUpdated);
  void refresh();

  return () => {
    clearTimeout(timer);
    browser.tabs.onActivated.removeListener(onActivated);
    browser.tabs.onUpdated.removeListener(onUpdated);
  };
}
