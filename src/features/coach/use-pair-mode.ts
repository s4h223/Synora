import { useEffect, useRef } from 'react';
import { PAIR_POLICIES, type PairState, shouldRunPairCheck } from '@/lib/ai/pair-trigger';
import type { Problem } from '@/lib/leetcode/types';
import { useCodeStore } from '../context/code-store';
import { useSettings } from '../settings/use-settings';
import { runPairCheck } from './coach-service';
import { coachDeps, useCoachStore } from './coach-store';

/**
 * Pair mode: when the student pauses typing, ask the model (rarely) whether
 * it's worth speaking up. Only runs with Live code access, a configured
 * provider, and Pair mode turned on.
 */
export function usePairMode(problem: Problem, aiReady: boolean) {
  const { settings } = useSettings();
  const mode = settings.pairMode;
  const enabled = aiReady && mode !== 'off' && settings.codeAccess === 'live';
  const conversationId = useCoachStore((s) => s.conversationId);
  const code = useCodeStore((s) => s.bySlug[problem.slug]);
  const baseline = useCodeStore((s) => s.baselineBySlug[problem.slug] ?? null);

  const track = useRef({
    lastChangeAt: 0,
    lastCheckAt: null as number | null,
    lastCheckedCode: null as string | null,
    lastCode: '',
    running: false,
  });

  // Reset tracking when the problem changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: slug is the reset trigger
  useEffect(() => {
    track.current = {
      lastChangeAt: 0,
      lastCheckAt: null,
      lastCheckedCode: null,
      lastCode: '',
      running: false,
    };
  }, [problem.slug]);

  useEffect(() => {
    useCoachStore.getState().set({ pairStatus: enabled ? 'watching' : 'off' });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !code || code.source !== 'live' || !conversationId) return;
    const policy = PAIR_POLICIES[mode];
    const t = track.current;
    if (code.code !== t.lastCode) {
      t.lastCode = code.code;
      t.lastChangeAt = Date.now();
    }

    const timer = setTimeout(async () => {
      const state: PairState = {
        code: code.code,
        baseline,
        lastChangeAt: t.lastChangeAt,
        lastCheckAt: t.lastCheckAt,
        lastCheckedCode: t.lastCheckedCode,
        busy: t.running || useCoachStore.getState().streamingId !== null,
      };
      if (!shouldRunPairCheck(state, policy, Date.now())) return;

      t.running = true;
      t.lastCheckAt = Date.now();
      t.lastCheckedCode = code.code;
      useCoachStore.getState().set({ pairStatus: 'thinking' });
      try {
        await runPairCheck(coachDeps, {
          conversationId,
          problem,
          level: settings.experienceLevel,
          mode,
          code: {
            code: code.code,
            languageId: code.languageId,
            source: 'live',
            cursorLine: code.cursorLine,
          },
        });
        useCoachStore.getState().set({ pairStatus: 'watching' });
      } catch (error) {
        console.warn('Synora: pair check failed', error);
        useCoachStore.getState().set({ pairStatus: 'error' });
      } finally {
        t.running = false;
      }
    }, policy.pauseMs + 100);

    return () => clearTimeout(timer);
  }, [enabled, mode, code, baseline, conversationId, problem, settings.experienceLevel]);
}
