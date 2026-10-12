import type { ProblemResolverDeps, TabLike } from '@/lib/leetcode/active-problem';
import type { GetProblemResponse, Problem } from '@/lib/leetcode/types';
import { createProblemStore } from './problem-store';

const tab = (slug: string, id = 1): TabLike => ({
  id,
  url: `https://leetcode.com/problems/${slug}/`,
});
const problem = (slug: string) => ({ slug, title: slug }) as Problem;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('createProblemStore', () => {
  it('ignores a slow response that a newer navigation superseded', async () => {
    const slow = deferred<GetProblemResponse>();
    let activeTab = tab('first');
    const deps: ProblemResolverDeps = {
      requestProblem: vi
        .fn()
        .mockImplementationOnce(() => slow.promise)
        .mockResolvedValueOnce({ ok: true, problem: problem('second') }),
      injectContentScript: vi.fn(),
    };
    const store = createProblemStore(async () => activeTab, deps);

    const first = store.getState().refresh();
    activeTab = tab('second');
    await store.getState().refresh();
    slow.resolve({ ok: true, problem: problem('first') });
    await first;

    const state = store.getState().state;
    expect(state.status === 'ready' && state.problem.slug).toBe('second');
  });

  it('skips re-fetching the problem that is already loaded', async () => {
    const deps: ProblemResolverDeps = {
      requestProblem: vi.fn().mockResolvedValue({ ok: true, problem: problem('two-sum') }),
      injectContentScript: vi.fn(),
    };
    const onReady = vi.fn();
    const store = createProblemStore(async () => tab('two-sum'), deps, onReady);

    await store.getState().refresh();
    await store.getState().refresh();
    expect(deps.requestProblem).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);

    await store.getState().refresh({ force: true });
    expect(deps.requestProblem).toHaveBeenCalledTimes(2);
  });
});
