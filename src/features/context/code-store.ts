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

/** The line the student is looking at: where the mouse rests, or where the cursor moved. */
export interface LineFocus {
  line: number;
  lineText: string;
  /** Identifier under the pointer (hover only). */
  word: string;
  source: 'hover' | 'cursor';
  at: number;
}

interface CodeStore {
  /** Code captured per problem slug. Memory only: cleared when the panel closes. */
  bySlug: Record<string, CodeContext>;
  /** First live snapshot per slug: LeetCode's starter template, used to ignore untouched code. */
  baselineBySlug: Record<string, string>;
  liveState: LiveState;
  focusBySlug: Record<string, LineFocus>;
  /** While pinned, hovering elsewhere doesn't change the focused line. */
  focusPinned: boolean;
  setCode(slug: string, context: CodeContext): void;
  setFocus(slug: string, focus: LineFocus): void;
  setFocusPinned(pinned: boolean): void;
  clearCode(slug: string): void;
  clearAll(): void;
  setLiveState(state: LiveState): void;
}

export const useCodeStore = create<CodeStore>((set) => ({
  bySlug: {},
  baselineBySlug: {},
  liveState: 'off',
  focusBySlug: {},
  focusPinned: false,
  setFocus: (slug, focus) =>
    set((s) => (s.focusPinned ? s : { focusBySlug: { ...s.focusBySlug, [slug]: focus } })),
  setFocusPinned: (focusPinned) => set({ focusPinned }),
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
  clearAll: () => set({ bySlug: {}, baselineBySlug: {}, focusBySlug: {}, focusPinned: false }),
  setLiveState: (liveState) => set({ liveState }),
}));
