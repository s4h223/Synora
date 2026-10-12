import { changedChars, PAIR_POLICIES, type PairState, shouldRunPairCheck } from './pair-trigger';

const policy = PAIR_POLICIES.quiet;
const STARTER = 'class Solution:\n    def twoSum(self, nums, target):\n        ';
const WORK = `${STARTER}seen = {}\n        for i, n in enumerate(nums):\n            pass`;

function state(overrides: Partial<PairState> = {}): PairState {
  return {
    code: WORK,
    baseline: STARTER,
    lastChangeAt: 0,
    lastCheckAt: null,
    lastCheckedCode: null,
    busy: false,
    ...overrides,
  };
}

describe('shouldRunPairCheck', () => {
  it('runs after a pause with meaningful new code', () => {
    expect(shouldRunPairCheck(state(), policy, policy.pauseMs)).toBe(true);
  });

  it('waits until the student pauses', () => {
    expect(shouldRunPairCheck(state(), policy, policy.pauseMs - 1)).toBe(false);
  });

  it('never checks untouched starter code', () => {
    expect(shouldRunPairCheck(state({ code: `${STARTER}\n\n` }), policy, 60_000)).toBe(false);
  });

  it('respects the cooldown between checks', () => {
    const s = state({ lastCheckAt: 10_000, lastCheckedCode: STARTER });
    expect(shouldRunPairCheck(s, policy, 10_000 + policy.cooldownMs - 1)).toBe(false);
    expect(shouldRunPairCheck(s, policy, 10_000 + policy.cooldownMs)).toBe(true);
  });

  it('skips trivial edits since the last check', () => {
    const s = state({ lastCheckAt: 0, lastCheckedCode: WORK, code: `${WORK}  ` });
    expect(shouldRunPairCheck(s, policy, 1_000_000)).toBe(false);
  });

  it('never overlaps with a reply in progress', () => {
    expect(shouldRunPairCheck(state({ busy: true }), policy, 60_000)).toBe(false);
  });
});

describe('changedChars', () => {
  it('ignores indentation and blank lines', () => {
    expect(changedChars('a\n  b\n', 'a\n\n    b')).toBe(0);
  });

  it('counts added and removed lines', () => {
    expect(changedChars('abc\nxyz', 'abc\nxy')).toBe(5);
  });
});
