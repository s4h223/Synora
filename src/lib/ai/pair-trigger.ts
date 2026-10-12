import type { PairMode } from '@/lib/settings';

export interface PairPolicy {
  /** How long the student must stop typing before a check. */
  pauseMs: number;
  /** Minimum time between checks (each check is an AI request). */
  cooldownMs: number;
  /** Minimum amount of changed code since the last check. */
  minChangedChars: number;
}

export const PAIR_POLICIES: Record<Exclude<PairMode, 'off'>, PairPolicy> = {
  quiet: { pauseMs: 8_000, cooldownMs: 60_000, minChangedChars: 20 },
  active: { pauseMs: 5_000, cooldownMs: 30_000, minChangedChars: 10 },
};

export interface PairState {
  code: string;
  /** Code when the problem was first seen (LeetCode's starter template). */
  baseline: string | null;
  lastChangeAt: number;
  lastCheckAt: number | null;
  lastCheckedCode: string | null;
  /** A chat reply or another check is in progress. */
  busy: boolean;
}

/** Decide whether a pair check should run now. Pure, so it's easy to test. */
export function shouldRunPairCheck(state: PairState, policy: PairPolicy, now: number): boolean {
  if (state.busy) return false;
  if (!state.code.trim()) return false;
  if (state.baseline !== null && normalize(state.code) === normalize(state.baseline)) return false;
  if (now - state.lastChangeAt < policy.pauseMs) return false;
  if (state.lastCheckAt !== null && now - state.lastCheckAt < policy.cooldownMs) return false;
  const reference = state.lastCheckedCode ?? state.baseline ?? '';
  return changedChars(reference, state.code) >= policy.minChangedChars;
}

/**
 * Approximate size of an edit: total length of lines present in one version but
 * not the other (multiset comparison, whitespace-insensitive). Cheap and good
 * enough to ignore trivial edits like re-indentation.
 */
export function changedChars(before: string, after: string): number {
  const count = new Map<string, number>();
  for (const line of lines(before)) count.set(line, (count.get(line) ?? 0) + 1);
  let changed = 0;
  for (const line of lines(after)) {
    const n = count.get(line) ?? 0;
    if (n > 0) count.set(line, n - 1);
    else changed += line.length;
  }
  for (const [line, n] of count) changed += line.length * n;
  return changed;
}

function lines(code: string): string[] {
  return code
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function normalize(code: string): string {
  return lines(code).join('\n');
}
