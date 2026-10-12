import type { Problem } from '@/lib/leetcode/types';
import {
  countLearningRecords,
  deleteAllLearningData,
  PROBLEM_OPEN_DEDUPE_MS,
  recordEvent,
  recordProblemOpened,
} from './repository';
import { SynoraDb } from './schema';

const problem = {
  slug: 'two-sum',
  frontendId: '1',
  title: 'Two Sum',
  difficulty: 'Easy',
  tags: [{ name: 'Array', slug: 'array' }],
} as Problem;

let db: SynoraDb;

beforeEach(() => {
  db = new SynoraDb(`test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await db.delete();
});

describe('recordProblemOpened', () => {
  it('stores the problem and logs an event', async () => {
    expect(await recordProblemOpened(db, problem, 1_000)).toBe(true);

    expect(await db.problems.get('two-sum')).toEqual({
      slug: 'two-sum',
      frontendId: '1',
      title: 'Two Sum',
      difficulty: 'Easy',
      tags: ['array'],
      firstSeenAt: 1_000,
      lastSeenAt: 1_000,
    });
    const events = await db.events.toArray();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'problem_opened', problemSlug: 'two-sum', at: 1_000 });
  });

  it('dedupes re-opens within the window but keeps firstSeenAt', async () => {
    await recordProblemOpened(db, problem, 1_000);
    expect(await recordProblemOpened(db, problem, 1_000 + PROBLEM_OPEN_DEDUPE_MS - 1)).toBe(false);
    expect(await recordProblemOpened(db, problem, 1_000 + PROBLEM_OPEN_DEDUPE_MS + 1)).toBe(true);

    expect(await db.events.count()).toBe(2);
    expect(await db.problems.get('two-sum')).toMatchObject({
      firstSeenAt: 1_000,
      lastSeenAt: 1_000 + PROBLEM_OPEN_DEDUPE_MS + 1,
    });
  });
});

describe('deleteAllLearningData', () => {
  it('removes every record', async () => {
    await recordProblemOpened(db, problem);
    await recordEvent(db, 'code_captured', 'two-sum', { source: 'paste', lines: 3 });
    expect(await countLearningRecords(db)).toBe(3);

    await deleteAllLearningData(db);
    expect(await countLearningRecords(db)).toBe(0);
  });
});
