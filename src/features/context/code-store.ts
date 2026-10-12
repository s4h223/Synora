import { create } from 'zustand';
import type { LiveSyncStatus } from '@/lib/leetcode/browser-bridge';

export interface CodeContext {
  code: string;
  languageId: string;
  source: 'editor' | 'paste' | 'live';
  capturedAt: number;
  truncated: boolean;
  /** Live mode only. */
  cursorLine?: number;
  selection?: string;
}

export type LiveState = LiveSyncStatus | 'off' | 'connecting';

interface CodeStore {
  /** Code captured per problem slug. Memory only: cleared when the panel closes. */
  bySlug: Record<string, CodeContext>;
  /** First live snapshot per slug: LeetCode's starter template, used to ignore untouched code. */
  baselineBySlug: Record<string, string>;
  liveState: LiveState;
  setCode(slug: string, context: CodeContext): void;
  clearCode(slug: string): void;
  clearAll(): void;
  setLiveState(state: LiveState): void;
}

export const useCodeStore = create<CodeStore>((set) => ({
  bySlug: {},
  baselineBySlug: {},
  liveState: 'off',
  setCode: (slug, context) =>
    set((s) => ({
      bySlug: { ...s.bySlug, [slug]: context },
      baselineBySlug:
        context.source === 'live' && s.baselineBySlug[slug] === undefined
          ? { ...s.baselineBySlug, [slug]: context.code }
          : s.baselineBySlug,
    })),
  clearCode: (slug) =>
    set((s) => {
      const { [slug]: _removed, ...rest } = s.bySlug;
      return { bySlug: rest };
    }),
  clearAll: () => set({ bySlug: {}, baselineBySlug: {} }),
  setLiveState: (liveState) => set({ liveState }),
}));
