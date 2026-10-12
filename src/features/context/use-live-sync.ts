import { useEffect } from 'react';
import { type LiveSyncStatus, startLiveSync, stopLiveSync } from '@/lib/leetcode/browser-bridge';
import type { LiveCodeMessage, LiveHoverMessage } from '@/lib/leetcode/live-sync';
import { useSettings } from '../settings/use-settings';
import { useCodeStore } from './code-store';
import { useProblemStore } from './problem-store';

const RETRY_DELAYS_MS = [500, 1_000, 2_000, 4_000];

function isLiveMessage(message: unknown): message is LiveCodeMessage | LiveHoverMessage {
  const type = (message as { type?: unknown } | null)?.type;
  return type === 'synora:live-code' || type === 'synora:live-hover';
}

/**
 * While code access is "live", install the editor watcher in the active
 * LeetCode tab and feed its snapshots into the code store. Re-installs after
 * reloads and problem switches; uninstalls when turned off or the panel closes.
 */
export function useLiveSync() {
  const { settings, loaded } = useSettings();
  // The ready-state object changes on navigation and forced refresh (page reload).
  const ready = useProblemStore((s) => (s.state.status === 'ready' ? s.state : null));
  const live = loaded && settings.codeAccess === 'live';

  useEffect(() => {
    const { setCode, setLiveState } = useCodeStore.getState();
    if (!live || !ready) {
      setLiveState('off');
      return;
    }
    const { tabId } = ready;
    const slug = ready.problem.slug;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const onMessage = (message: unknown, sender: { tab?: { id?: number } }) => {
      if (!isLiveMessage(message) || sender.tab?.id !== tabId || message.slug !== slug) return;
      const store = useCodeStore.getState();

      if (message.type === 'synora:live-hover') {
        store.setFocus(slug, { ...message.hover, source: 'hover', at: Date.now() });
        return;
      }

      const { snapshot } = message;
      const previous = store.bySlug[slug];
      setCode(slug, {
        code: snapshot.code,
        languageId: snapshot.languageId,
        source: 'live',
        capturedAt: Date.now(),
        truncated: snapshot.truncated,
        cursorLine: snapshot.cursorLine,
        selection: snapshot.selection,
      });
      // Moving the cursor to another line also focuses it (keyboard users).
      if (previous?.source === 'live' && previous.cursorLine !== snapshot.cursorLine) {
        store.setFocus(slug, {
          line: snapshot.cursorLine,
          lineText: snapshot.code.split('\n')[snapshot.cursorLine - 1] ?? '',
          word: '',
          source: 'cursor',
          at: Date.now(),
        });
      }
      store.setLiveState('installed');
    };
    browser.runtime.onMessage.addListener(onMessage);

    // Monaco may not exist yet right after a page load, so retry briefly.
    const install = async (attempt: number) => {
      setLiveState('connecting');
      const status: LiveSyncStatus = await startLiveSync(tabId);
      if (cancelled) return;
      if (status === 'no-editor' && attempt < RETRY_DELAYS_MS.length) {
        retryTimer = setTimeout(() => void install(attempt + 1), RETRY_DELAYS_MS[attempt]);
        return;
      }
      setLiveState(status);
    };
    void install(0);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      browser.runtime.onMessage.removeListener(onMessage);
      void stopLiveSync(tabId);
    };
  }, [live, ready]);
}
