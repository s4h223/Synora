import { type ProblemResolverDeps, resolveProblemState } from './active-problem';
import type { Problem } from './types';

const problem = { slug: 'two-sum', title: 'Two Sum' } as Problem;
const URL_TWO_SUM = 'https://leetcode.com/problems/two-sum/';

function deps(overrides: Partial<ProblemResolverDeps> = {}): ProblemResolverDeps {
  return {
    requestProblem: vi.fn().mockResolvedValue({ ok: true, problem }),
    injectContentScript: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('resolveProblemState', () => {
  it('reports no problem for non-LeetCode tabs without contacting the page', async () => {
    const d = deps();
    expect(await resolveProblemState({ id: 1, url: undefined }, d)).toEqual({
      status: 'no-problem',
      reason: 'not-leetcode',
    });
    expect(d.requestProblem).not.toHaveBeenCalled();
  });

  it('reports contest pages distinctly', async () => {
    expect(
      await resolveProblemState({ id: 1, url: 'https://leetcode.com/contest/weekly-1/' }, deps()),
    ).toEqual({ status: 'no-problem', reason: 'contest' });
  });

  it('returns the problem from the content script', async () => {
    expect(await resolveProblemState({ id: 7, url: URL_TWO_SUM }, deps())).toEqual({
      status: 'ready',
      problem,
      tabId: 7,
    });
  });

  it('injects the content script once if it is not listening, then retries', async () => {
    const requestProblem = vi
      .fn()
      .mockRejectedValueOnce(new Error('Receiving end does not exist'))
      .mockResolvedValueOnce({ ok: true, problem });
    const d = deps({ requestProblem });

    expect(await resolveProblemState({ id: 7, url: URL_TWO_SUM }, d)).toMatchObject({
      status: 'ready',
    });
    expect(d.injectContentScript).toHaveBeenCalledWith(7);
    expect(requestProblem).toHaveBeenCalledTimes(2);
  });

  it('reports disconnected when injection fails', async () => {
    const d = deps({
      requestProblem: vi.fn().mockRejectedValue(new Error('no receiver')),
      injectContentScript: vi.fn().mockRejectedValue(new Error('cannot access')),
    });
    expect(await resolveProblemState({ id: 7, url: URL_TWO_SUM }, d)).toEqual({
      status: 'disconnected',
      slug: 'two-sum',
      tabId: 7,
    });
  });

  it('maps content script failures to error states', async () => {
    const notFound = deps({
      requestProblem: vi.fn().mockResolvedValue({ ok: false, reason: 'not-found' }),
    });
    expect(await resolveProblemState({ id: 7, url: URL_TWO_SUM }, notFound)).toMatchObject({
      status: 'error',
      message: 'LeetCode has no problem at this URL.',
    });

    const failed = deps({
      requestProblem: vi
        .fn()
        .mockResolvedValue({ ok: false, reason: 'fetch-failed', message: 'HTTP 429' }),
    });
    expect(await resolveProblemState({ id: 7, url: URL_TWO_SUM }, failed)).toMatchObject({
      status: 'error',
      message: 'HTTP 429',
    });
  });
});
