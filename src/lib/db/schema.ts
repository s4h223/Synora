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

export type EventType =
  | 'problem_opened'
  | 'code_captured'
  | 'coach_message'
  | 'hint_requested'
  | 'solution_revealed'
  | 'pair_nudge';

export interface EventRecord {
  id: string;
  type: EventType;
  problemSlug: string | null;
  at: number;
  /** Small, event-specific payload. Never raw code or audio. */
  data?: Record<string, string | number | boolean | null>;
}

export interface ConversationRecord {
  id: string;
  problemSlug: string;
  createdAt: number;
  updatedAt: number;
}

export type MessageStatus = 'streaming' | 'complete' | 'stopped' | 'error' | 'refused';
export type MessageKind = 'chat' | 'hint' | 'action' | 'nudge';

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  kind: MessageKind;
  /** What the student sees. */
  content: string;
  /** What the model received for user turns (instructions + numbered code). */
  modelContent?: string;
  createdAt: number;
  status: MessageStatus;
  hintLevel?: number;
  action?: string;
  /** Summary of attached code (the code itself lives in modelContent). */
  code?: { languageId: string; lines: number; source: string };
  /** Editor line a nudge refers to. */
  line?: number;
  error?: string;
  model?: string;
}

export class SynoraDb extends Dexie {
  problems!: EntityTable<ProblemRecord, 'slug'>;
  events!: EntityTable<EventRecord, 'id'>;
  conversations!: EntityTable<ConversationRecord, 'id'>;
  messages!: EntityTable<MessageRecord, 'id'>;

  constructor(name = 'synora') {
    super(name);
    this.version(1).stores({
      problems: 'slug, lastSeenAt',
      events: 'id, type, problemSlug, at, [problemSlug+type]',
    });
    this.version(2).stores({
      conversations: 'id, problemSlug, updatedAt, [problemSlug+updatedAt]',
      messages: 'id, conversationId, [conversationId+createdAt]',
    });
  }
}

export const db = new SynoraDb();
