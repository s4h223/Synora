import { streamOf } from '../../../tests/helpers';
import { createOpenAiCompatible } from './openai-compatible';
import { AiError } from './types';

function sseResponse(events: unknown[], status = 200): Response {
  const body = events.map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`);
  return new Response(streamOf(body), { status });
}

const delta = (content: string, finish: string | null = null) => ({
  model: 'llama-x',
  choices: [{ delta: { content }, finish_reason: finish }],
});

describe('createOpenAiCompatible', () => {
  it('streams text and sends the system prompt first', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(sseResponse([delta('Hel'), delta('lo', 'stop'), '[DONE]']));
    const provider = createOpenAiCompatible({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-test',
      model: 'llama-x',
      fetchImpl,
    });

    const chunks: string[] = [];
    const result = await provider.streamChat(
      { system: 'SYS', messages: [{ role: 'user', content: 'hi' }] },
      { onText: (t) => chunks.push(t) },
    );

    expect(chunks.join('')).toBe('Hello');
    expect(result).toEqual({ stopReason: 'end', servedBy: 'llama-x' });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.example.com/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: 'llama-x', stream: true });
    expect(body.messages).toEqual([
      { role: 'system', content: 'SYS' },
      { role: 'user', content: 'hi' },
    ]);
  });

  it('omits Authorization when there is no key (local servers)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse(['[DONE]']));
    await createOpenAiCompatible({
      baseUrl: 'http://localhost:11434/v1',
      model: 'm',
      fetchImpl,
    }).streamChat({ system: 's', messages: [] }, { onText: () => {} });
    expect(fetchImpl.mock.calls[0]![1].headers).not.toHaveProperty('Authorization');
  });

  it('maps length and content_filter finish reasons', async () => {
    const run = async (finish: string) => {
      const fetchImpl = vi.fn().mockResolvedValue(sseResponse([delta('x', finish)]));
      return createOpenAiCompatible({ baseUrl: 'https://x', model: 'm', fetchImpl }).streamChat(
        { system: 's', messages: [] },
        { onText: () => {} },
      );
    };
    expect((await run('length')).stopReason).toBe('max_tokens');
    expect((await run('content_filter')).stopReason).toBe('refusal');
  });

  it.each([
    [401, 'auth'],
    [403, 'permission'],
    [404, 'not_found'],
    [429, 'rate_limit'],
    [500, 'server'],
    [400, 'bad_request'],
  ])('maps HTTP %i to %s with the provider message', async (status, kind) => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: { message: 'nope' } }), { status }));
    const err = await createOpenAiCompatible({ baseUrl: 'https://x', model: 'm', fetchImpl })
      .streamChat({ system: 's', messages: [] }, { onText: () => {} })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err).toMatchObject({ kind, detail: 'nope' });
  });

  it('surfaces errors sent inside the stream', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(sseResponse([{ error: { message: 'overloaded' } }]));
    await expect(
      createOpenAiCompatible({ baseUrl: 'https://x', model: 'm', fetchImpl }).streamChat(
        { system: 's', messages: [] },
        { onText: () => {} },
      ),
    ).rejects.toMatchObject({ kind: 'server', detail: 'overloaded' });
  });

  it('reports aborts as aborted, other fetch failures as network', async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted = vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError'));
    await expect(
      createOpenAiCompatible({ baseUrl: 'https://x', model: 'm', fetchImpl: aborted }).streamChat(
        { system: 's', messages: [], signal: controller.signal },
        { onText: () => {} },
      ),
    ).rejects.toMatchObject({ kind: 'aborted' });

    const offline = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      createOpenAiCompatible({ baseUrl: 'https://x', model: 'm', fetchImpl: offline }).streamChat(
        { system: 's', messages: [] },
        { onText: () => {} },
      ),
    ).rejects.toMatchObject({ kind: 'network' });
  });

  it('lists models from /models, stripping Gemini-style prefixes', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: [{ id: 'models/b' }, { id: 'a' }] }), { status: 200 }),
      );
    const models = await createOpenAiCompatible({
      baseUrl: 'https://x/v1',
      model: 'm',
      fetchImpl,
    }).listModels?.();
    expect(models).toEqual(['a', 'b']);
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://x/v1/models');
  });
});
