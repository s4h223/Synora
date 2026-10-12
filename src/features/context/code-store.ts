import { create } from 'zustand';

export interface CodeContext {
  code: string;
  languageId: string;
  source: 'editor' | 'paste';
  capturedAt: number;
  truncated: boolean;
}

interface CodeStore {
  /** Code captured per problem slug. Memory only: cleared when the panel closes. */
  bySlug: Record<string, CodeContext>;
  setCode(slug: string, context: CodeContext): void;
  clearCode(slug: string): void;
  clearAll(): void;
}

export const useCodeStore = create<CodeStore>((set) => ({
  bySlug: {},
  setCode: (slug, context) => set((s) => ({ bySlug: { ...s.bySlug, [slug]: context } })),
  clearCode: (slug) =>
    set((s) => {
      const { [slug]: _removed, ...rest } = s.bySlug;
      return { bySlug: rest };
    }),
  clearAll: () => set({ bySlug: {} }),
}));
