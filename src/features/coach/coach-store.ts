import { create } from 'zustand';
import { getAiConfig, resolveActiveProvider } from '@/lib/ai/config';
import { createProvider } from '@/lib/ai/create-provider';
import { db } from '@/lib/db/schema';
import { getSettings } from '@/lib/settings';
import type { CoachDeps } from './coach-service';

export const coachDeps: CoachDeps = {
  db,
  async resolveProvider() {
    const resolved = resolveActiveProvider(await getAiConfig());
    return resolved ? { provider: createProvider(resolved), model: resolved.model } : null;
  },
  async tracking() {
    return (await getSettings()).sessionTracking;
  },
};

export type PairStatus = 'off' | 'watching' | 'thinking' | 'error';

interface CoachStore {
  conversationId: string | null;
  /** The assistant message currently streaming, and its text so far. */
  streamingId: string | null;
  streamingText: string;
  pairStatus: PairStatus;
  /** Whether to attach the current code to the next message. */
  attachCode: boolean;
  set(patch: Partial<Omit<CoachStore, 'set'>>): void;
}

export const useCoachStore = create<CoachStore>((set) => ({
  conversationId: null,
  streamingId: null,
  streamingText: '',
  pairStatus: 'off',
  attachCode: true,
  set: (patch) => set(patch),
}));
