import type { Problem } from '@/lib/leetcode/types';
import type { EventRecord, EventType, SynoraDb } from './schema';

/** Re-opening the same problem within this window doesn't count as a new visit. */
export const PROBLEM_OPEN_DEDUPE_MS = 30 * 60 * 1000;

export async function recordEvent(
  db: SynoraDb,
  type: EventType,
  problemSlug: string | null,
  data?: EventRecord['data'],
  now = Date.now(),
): Promise<EventRecord> {
  const event: EventRecord = { id: crypto.randomUUID(), type, problemSlug, at: now };
  if (data) event.data = data;
  await db.events.add(event);
  return event;
}

/**
 * Upsert the problem and log `problem_opened`, unless the same problem was
 * opened recently. Returns true if a new event was recorded.
 */
export async function recordProblemOpened(
  db: SynoraDb,
  problem: Problem,
  now = Date.now(),
): Promise<boolean> {
  return db.transaction('rw', db.problems, db.events, async () => {
    const existing = await db.problems.get(problem.slug);
    await db.problems.put({
      slug: problem.slug,
      frontendId: problem.frontendId,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags.map((t) => t.slug),
      firstSeenAt: existing?.firstSeenAt ?? now,
      lastSeenAt: now,
    });

    const last = await db.events
      .where('[problemSlug+type]')
      .equals([problem.slug, 'problem_opened'])
      .reverse()
      .sortBy('at')
      .then((events) => events[0]);
    if (last && now - last.at < PROBLEM_OPEN_DEDUPE_MS) return false;

    await recordEvent(db, 'problem_opened', problem.slug, undefined, now);
    return true;
  });
}

/** Delete every locally stored learning record. Settings are cleared separately. */
export async function deleteAllLearningData(db: SynoraDb): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
}

export async function countLearningRecords(db: SynoraDb): Promise<number> {
  const counts = await Promise.all(db.tables.map((table) => table.count()));
  return counts.reduce((sum, n) => sum + n, 0);
}
