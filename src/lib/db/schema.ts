import Dexie, { type EntityTable } from 'dexie';
import type { Difficulty } from '@/lib/leetcode/types';

/**
 * Local-first data model. Every record carries timestamps (and UUIDs where rows
 * are user-generated) so an optional cloud sync can be added later without
 * rewriting history.
 */

export interface ProblemRecord {
  slug: string;
  frontendId: string;
  title: string;
  difficulty: Difficulty | null;
  tags: string[];
  firstSeenAt: number;
  lastSeenAt: number;
}

export type EventType = 'problem_opened' | 'code_captured';

export interface EventRecord {
  id: string;
  type: EventType;
  problemSlug: string | null;
  at: number;
  /** Small, event-specific payload. Never raw code or audio. */
  data?: Record<string, string | number | boolean | null>;
}

export class SynoraDb extends Dexie {
  problems!: EntityTable<ProblemRecord, 'slug'>;
  events!: EntityTable<EventRecord, 'id'>;

  constructor(name = 'synora') {
    super(name);
    this.version(1).stores({
      problems: 'slug, lastSeenAt',
      events: 'id, type, problemSlug, at, [problemSlug+type]',
    });
  }
}

export const db = new SynoraDb();
