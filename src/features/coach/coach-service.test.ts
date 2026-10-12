import { AiError, type AiProvider, type ChatRequest } from '@/lib/ai/types';
import { SynoraDb } from '@/lib/db/schema';
import type { Problem } from '@/lib/leetcode/types';
import {
  type CoachDeps,
  getOrCreateConversation,
  listMessages,
  retryTurn,
  runPairCheck,
  sendTurn,
} from './coach-service';

const problem = {
  slug: 'two-sum',
  frontendId: '1',
  title: 'Two Sum',
  difficulty: 'Easy',
  tags: [],
  description: 'desc',
  signature: null,
} as unknown as Problem;

/** Provider that replies with scripted text and records requests. */
function scripted(replies: (string | Error)[]) {
  const requests: ChatRequest[] = [];
  const provider: AiProvider = {
    async streamChat(req, handlers) {
      requests.push(req);
      const next = replies.shift() ?? 'ok';
      if (next instanceof Error) throw next;
      for (const word of next.split(/(?<= )/)) handlers.onText(word);
      return { stopReason: 'end' };
    },
  };
  return { provider, requests };
}

let db: SynoraDb;
let clock: number;

function deps(provider: AiProvider | null, tracking = true): CoachDeps {
  return {
    db,
    resolveProvider: async () => (provider ? { provider, model: 'test-model' } : null),
    tracking: async () => tracking,
    now: () => ++clock,
  };
}

beforeEach(() => {
  db = new SynoraDb(`coach-${crypto.randomUUID()}`);
  clock = 1_000;
});

afterEach(async () => {
  await db.delete();
});

describe('sendTurn', () => {
  it('stores the exchange and streams text', async () => {
    const { provider, requests } = scripted(['Think about complements.']);
    const conversation = await getOrCreateConversation(db, 'two-sum');
    const chunks: string[] = [];

    const reply = await sendTurn(deps(provider), {
      conversationId: conversation.id,
      problem,
      level: 'beginner',
      display: 'Give me a hint (level 1).',
      kind: 'hint',
      hintLevel: 1,
      instruction: 'HINT-1',
      code: { code: 'x = 1', languageId: 'python', source: 'live' },
      onText: (t) => chunks.push(t),
    });

    expect(reply).toMatchObject({ status: 'complete', content: 'Think about complements.' });
    expect(chunks.join('')).toBe('Think about complements.');

    const [user, assistant] = await listMessages(db, conversation.id);
    expect(user).toMatchObject({
      role: 'user',
      content: 'Give me a hint (level 1).',
      hintLevel: 1,
      code: { languageId: 'python', lines: 1, source: 'live' },
    });
    expect(user!.modelContent).toContain('<synora>HINT-1</synora>');
    expect(assistant!.id).toBe(reply.id);

    expect(requests[0]!.system).toContain('The student is a beginner');
    expect(requests[0]!.messages).toEqual([{ role: 'user', content: user!.modelContent }]);

    const events = await db.events.toArray();
    expect(events.map((e) => e.type).sort()).toEqual(['coach_message', 'hint_requested']);
  });

  it('records solution reveals and respects tracking being off', async () => {
    const conversation = await getOrCreateConversation(db, 'two-sum');
    await sendTurn(deps(scripted(['sol']).provider), {
      conversationId: conversation.id,
      problem,
      level: 'advanced',
      display: 'Show me the full solution.',
      kind: 'hint',
      hintLevel: 4,
    });
    expect((await db.events.toArray()).map((e) => e.type)).toContain('solution_revealed');

    await db.events.clear();
    await sendTurn(deps(scripted(['x']).provider, false), {
      conversationId: conversation.id,
      problem,
      level: 'advanced',
      display: 'hi',
      kind: 'chat',
    });
    expect(await db.events.count()).toBe(0);
  });

  it('sends prior turns as history', async () => {
    const { provider, requests } = scripted(['first', 'second']);
    const conversation = await getOrCreateConversation(db, 'two-sum');
    const base = {
      conversationId: conversation.id,
      problem,
      level: 'intermediate' as const,
      kind: 'chat' as const,
    };
    await sendTurn(deps(provider), { ...base, display: 'q1' });
    await sendTurn(deps(provider), { ...base, display: 'q2' });
    expect(requests[1]!.messages.map((m) => [m.role, m.content])).toEqual([
      ['user', 'q1'],
      ['assistant', 'first'],
      ['user', 'q2'],
    ]);
  });

  it('stores provider errors on the reply and supports retry', async () => {
    const { provider } = scripted([new AiError('rate_limit', '429'), 'recovered']);
    const conversation = await getOrCreateConversation(db, 'two-sum');
    const failed = await sendTurn(deps(provider), {
      conversationId: conversation.id,
      problem,
      level: 'beginner',
      display: 'help',
      kind: 'chat',
    });
    expect(failed.status).toBe('error');
    expect(failed.error).toContain('rate-limiting');

    const retried = await retryTurn(deps(provider), failed.id, {
      conversationId: conversation.id,
      problem,
      level: 'beginner',
    });
    expect(retried).toMatchObject({ status: 'complete', content: 'recovered' });
    const messages = await listMessages(db, conversation.id);
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it('keeps partial text when stopped', async () => {
    const controller = new AbortController();
    const provider: AiProvider = {
      async streamChat(_req, handlers) {
        handlers.onText('partial ');
        controller.abort();
        throw new AiError('aborted');
      },
    };
    const conversation = await getOrCreateConversation(db, 'two-sum');
    const reply = await sendTurn(deps(provider), {
      conversationId: conversation.id,
      problem,
      level: 'beginner',
      display: 'go',
      kind: 'chat',
      signal: controller.signal,
    });
    expect(reply).toMatchObject({ status: 'stopped', content: 'partial ' });
  });

  it('refuses to run without a provider', async () => {
    const conversation = await getOrCreateConversation(db, 'two-sum');
    await expect(
      sendTurn(deps(null), {
        conversationId: conversation.id,
        problem,
        level: 'beginner',
        display: 'x',
        kind: 'chat',
      }),
    ).rejects.toMatchObject({ kind: 'config' });
  });
});

describe('runPairCheck', () => {
  const code = {
    code: 'for i in range(n):\n  pass',
    languageId: 'python',
    source: 'live',
    cursorLine: 2,
  };

  it('stores a nudge when the model chooses to speak', async () => {
    const { provider, requests } = scripted([
      '{"speak": true, "kind": "bug", "message": "range(n) skips nothing, but check n=0.", "line": 1}',
    ]);
    const conversation = await getOrCreateConversation(db, 'two-sum');
    const nudge = await runPairCheck(deps(provider), {
      conversationId: conversation.id,
      problem,
      level: 'beginner',
      mode: 'quiet',
      code,
    });
    expect(nudge).toMatchObject({ kind: 'nudge', role: 'assistant', line: 1 });
    expect(requests[0]!.messages).toHaveLength(1);
    expect(requests[0]!.messages[0]!.content).toContain('Pair mode check');
    expect((await db.events.toArray()).map((e) => e.type)).toEqual(['pair_nudge']);
  });

  it('stays silent when the model says so or replies with junk', async () => {
    const conversation = await getOrCreateConversation(db, 'two-sum');
    for (const reply of ['{"speak": false}', 'I think it looks fine!']) {
      const result = await runPairCheck(deps(scripted([reply]).provider), {
        conversationId: conversation.id,
        problem,
        level: 'beginner',
        mode: 'active',
        code,
      });
      expect(result).toBeNull();
    }
    expect(await listMessages(db, conversation.id)).toEqual([]);
  });

  it('tells the model what it already said', async () => {
    const { provider, requests } = scripted([
      '{"speak": true, "message": "first tip"}',
      '{"speak": false}',
    ]);
    const conversation = await getOrCreateConversation(db, 'two-sum');
    const input = {
      conversationId: conversation.id,
      problem,
      level: 'beginner' as const,
      mode: 'active' as const,
      code,
    };
    await runPairCheck(deps(provider), input);
    await runPairCheck(deps(provider), input);
    expect(requests[1]!.messages[0]!.content).toContain('"first tip"');
  });
});
