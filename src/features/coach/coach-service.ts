import { prepareHistory } from '@/lib/ai/history';
import { buildPairCheckTurn, parsePairVerdict } from '@/lib/ai/prompts/pair';
import { buildTutorSystemPrompt, buildUserTurn, type CodeForPrompt } from '@/lib/ai/prompts/tutor';
import { AiError, type AiProvider, type ChatTurn } from '@/lib/ai/types';
import { recordEvent } from '@/lib/db/repository';
import type { ConversationRecord, MessageKind, MessageRecord, SynoraDb } from '@/lib/db/schema';
import type { Problem } from '@/lib/leetcode/types';
import type { ExperienceLevel, PairMode } from '@/lib/settings';

export interface CoachDeps {
  db: SynoraDb;
  /** The configured provider, or null if AI isn't set up. */
  resolveProvider(): Promise<{ provider: AiProvider; model: string } | null>;
  /** Whether learning events should be recorded. */
  tracking(): Promise<boolean>;
  now?(): number;
}

export interface AttachedCode extends CodeForPrompt {
  source: string;
}

export async function getOrCreateConversation(
  db: SynoraDb,
  problemSlug: string,
  now = Date.now(),
): Promise<ConversationRecord> {
  const latest = await db.conversations
    .where('[problemSlug+updatedAt]')
    .between([problemSlug, -Infinity], [problemSlug, Infinity])
    .last();
  return latest ?? createConversation(db, problemSlug, now);
}

export async function createConversation(
  db: SynoraDb,
  problemSlug: string,
  now = Date.now(),
): Promise<ConversationRecord> {
  const conversation = { id: crypto.randomUUID(), problemSlug, createdAt: now, updatedAt: now };
  await db.conversations.add(conversation);
  return conversation;
}

export function listMessages(db: SynoraDb, conversationId: string): Promise<MessageRecord[]> {
  return db.messages
    .where('[conversationId+createdAt]')
    .between([conversationId, -Infinity], [conversationId, Infinity])
    .toArray();
}

/** Messages that become model context. Failed replies are excluded. */
export function toTurns(messages: MessageRecord[]): ChatTurn[] {
  return messages
    .filter((m) => m.status === 'complete' || m.status === 'stopped' || m.role === 'user')
    .filter((m) => m.content.trim() || m.modelContent)
    .map((m) => ({
      role: m.role,
      content:
        m.role === 'user'
          ? (m.modelContent ?? m.content)
          : m.kind === 'nudge'
            ? `(Note I gave while they were coding) ${m.content}`
            : m.content,
    }));
}

export interface TurnInput {
  conversationId: string;
  problem: Problem;
  level: ExperienceLevel;
  /** What the student sees in the chat. */
  display: string;
  kind: MessageKind;
  instruction?: string | undefined;
  hintLevel?: number | undefined;
  action?: string | undefined;
  code?: AttachedCode | undefined;
  signal?: AbortSignal | undefined;
  /** Retry: reuse this existing user message instead of adding a new one. */
  retryOfUserMessageId?: string;
  onStart?(assistantId: string): void;
  onText?(delta: string): void;
  onReset?(): void;
}

/**
 * Send one tutor turn: persist the user message, stream the reply into a
 * placeholder assistant message, then persist the final state. Never throws
 * for provider errors; the error is stored on the assistant message.
 */
export async function sendTurn(deps: CoachDeps, input: TurnInput): Promise<MessageRecord> {
  const now = deps.now ?? Date.now;
  const resolved = await deps.resolveProvider();
  if (!resolved) throw new AiError('config');

  const prior = await listMessages(deps.db, input.conversationId);
  let userMessage: MessageRecord | undefined;
  let history: MessageRecord[];

  if (input.retryOfUserMessageId) {
    const index = prior.findIndex((m) => m.id === input.retryOfUserMessageId);
    userMessage = prior[index];
    if (!userMessage) throw new Error('Message to retry not found');
    history = prior.slice(0, index + 1);
  } else {
    userMessage = {
      id: crypto.randomUUID(),
      conversationId: input.conversationId,
      role: 'user',
      kind: input.kind,
      content: input.display,
      modelContent: buildUserTurn({
        text: input.display,
        code: input.code,
        instruction: input.instruction,
      }),
      createdAt: now(),
      status: 'complete',
      ...(input.hintLevel ? { hintLevel: input.hintLevel } : {}),
      ...(input.action ? { action: input.action } : {}),
      ...(input.code
        ? {
            code: {
              languageId: input.code.languageId,
              lines: input.code.code.split('\n').length,
              source: input.code.source,
            },
          }
        : {}),
    };
    await deps.db.messages.add(userMessage);
    history = [...prior, userMessage];
  }

  const assistant: MessageRecord = {
    id: crypto.randomUUID(),
    conversationId: input.conversationId,
    role: 'assistant',
    kind: input.kind === 'nudge' ? 'chat' : input.kind,
    content: '',
    createdAt: Math.max(now(), userMessage.createdAt + 1),
    status: 'streaming',
    model: resolved.model,
  };
  await deps.db.messages.add(assistant);
  input.onStart?.(assistant.id);

  let text = '';
  try {
    const result = await resolved.provider.streamChat(
      {
        system: buildTutorSystemPrompt(input.problem, input.level),
        messages: prepareHistory(toTurns(history)),
        ...(input.signal ? { signal: input.signal } : {}),
      },
      {
        onText: (delta) => {
          text += delta;
          input.onText?.(delta);
        },
        onReset: () => {
          text = '';
          input.onReset?.();
        },
      },
    );
    assistant.content = text;
    assistant.status = result.stopReason === 'refusal' ? 'refused' : 'complete';
    if (result.servedBy) assistant.model = result.servedBy;
  } catch (error) {
    const aiError = error instanceof AiError ? error : new AiError('network', String(error));
    assistant.content = text;
    if (aiError.kind === 'aborted') {
      assistant.status = 'stopped';
    } else {
      assistant.status = 'error';
      assistant.error = aiError.detail ? `${aiError.message} (${aiError.detail})` : aiError.message;
    }
  }

  await deps.db.messages.put(assistant);
  await deps.db.conversations.update(input.conversationId, { updatedAt: now() });
  if (!input.retryOfUserMessageId) await logTurn(deps, input);
  return assistant;
}

async function logTurn(deps: CoachDeps, input: TurnInput) {
  if (!(await deps.tracking())) return;
  const slug = input.problem.slug;
  await recordEvent(deps.db, 'coach_message', slug, {
    kind: input.kind,
    action: input.action ?? null,
    withCode: !!input.code,
  });
  if (input.kind === 'hint' && input.hintLevel) {
    await recordEvent(deps.db, 'hint_requested', slug, { level: input.hintLevel });
    if (input.hintLevel >= 4) await recordEvent(deps.db, 'solution_revealed', slug);
  }
}

/** Remove a failed reply and generate it again from the same user message. */
export async function retryTurn(
  deps: CoachDeps,
  assistantId: string,
  input: Omit<TurnInput, 'display' | 'kind' | 'retryOfUserMessageId'>,
): Promise<MessageRecord> {
  const messages = await listMessages(deps.db, input.conversationId);
  const index = messages.findIndex((m) => m.id === assistantId);
  const user = messages
    .slice(0, index)
    .reverse()
    .find((m) => m.role === 'user');
  if (index === -1 || !user) throw new Error('Nothing to retry');
  await deps.db.messages.delete(assistantId);
  return sendTurn(deps, {
    ...input,
    display: user.content,
    kind: user.kind,
    retryOfUserMessageId: user.id,
  });
}

/** Mark replies left "streaming" (e.g. the panel closed mid-reply) as stopped. */
export async function settleInterrupted(db: SynoraDb, conversationId: string): Promise<void> {
  const messages = await listMessages(db, conversationId);
  await Promise.all(
    messages
      .filter((m) => m.status === 'streaming')
      .map((m) => db.messages.update(m.id, { status: 'stopped' })),
  );
}

export interface PairCheckInput {
  conversationId: string;
  problem: Problem;
  level: ExperienceLevel;
  mode: Exclude<PairMode, 'off'>;
  code: AttachedCode;
  signal?: AbortSignal;
}

/**
 * Ask the model whether to speak up about the student's live code. Returns the
 * stored nudge, or null if the model chose silence (the common case) or
 * replied with something unparseable.
 */
export async function runPairCheck(
  deps: CoachDeps,
  input: PairCheckInput,
): Promise<MessageRecord | null> {
  const resolved = await deps.resolveProvider();
  if (!resolved) return null;
  const now = deps.now ?? Date.now;

  const previous = (await listMessages(deps.db, input.conversationId))
    .filter((m) => m.kind === 'nudge')
    .slice(-3)
    .map((m) => m.content);

  let raw = '';
  await resolved.provider.streamChat(
    {
      system: buildTutorSystemPrompt(input.problem, input.level),
      messages: [{ role: 'user', content: buildPairCheckTurn(input.code, input.mode, previous) }],
      ...(input.signal ? { signal: input.signal } : {}),
    },
    {
      onText: (delta) => {
        raw += delta;
      },
      onReset: () => {
        raw = '';
      },
    },
  );

  const verdict = parsePairVerdict(raw);
  if (!verdict?.speak || !verdict.message) return null;

  const nudge: MessageRecord = {
    id: crypto.randomUUID(),
    conversationId: input.conversationId,
    role: 'assistant',
    kind: 'nudge',
    content: verdict.message.trim(),
    createdAt: now(),
    status: 'complete',
    model: resolved.model,
    ...(verdict.line ? { line: verdict.line } : {}),
  };
  await deps.db.messages.add(nudge);
  await deps.db.conversations.update(input.conversationId, { updatedAt: now() });
  if (await deps.tracking()) {
    await recordEvent(deps.db, 'pair_nudge', input.problem.slug, { kind: verdict.kind ?? 'tip' });
  }
  return nudge;
}
