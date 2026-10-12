import type Anthropic from '@anthropic-ai/sdk';
import { createAnthropic, supportsEffort, supportsServerFallback } from './anthropic';
import type { AiError } from './types';

/** Minimal stand-in for the SDK: records params and replays scripted stream events. */
function fakeSdk(events: unknown[], final: { stop_reason: string; model: string }, fail?: Error) {
  const calls: { params: Record<string, unknown>; options: unknown }[] = [];
  class APIError extends Error {
    constructor(
      readonly status: number | undefined,
      message: string,
    ) {
      super(message);
    }
  }
  class APIUserAbortError extends APIError {}
  class APIConnectionError extends APIError {}
  class FakeAnthropic {
    static APIError = APIError;
    static APIUserAbortError = APIUserAbortError;
    static APIConnectionError = APIConnectionError;
    constructor(readonly opts: Record<string, unknown>) {
      FakeAnthropic.lastOptions = opts;
    }
    static lastOptions: Record<string, unknown> = {};
    beta = {
      messages: {
        stream: (params: Record<string, unknown>, options: unknown) => {
          calls.push({ params, options });
          return {
            async *[Symbol.asyncIterator]() {
              if (fail) throw fail;
              yield* events;
            },
            finalMessage: async () => final,
          };
        },
      },
    };
  }
  return {
    calls,
    Sdk: FakeAnthropic as unknown as typeof Anthropic,
    errors: { APIError, APIUserAbortError, APIConnectionError },
    FakeAnthropic,
  };
}

const textDelta = (text: string) => ({
  type: 'content_block_delta',
  delta: { type: 'text_delta', text },
});

describe('createAnthropic', () => {
  it('streams text with caching, effort and server fallback for current models', async () => {
    const fake = fakeSdk([textDelta('Hi'), textDelta(' there')], {
      stop_reason: 'end_turn',
      model: 'claude-opus-5-5',
    });
    const provider = createAnthropic({
      apiKey: 'sk-ant-x',
      model: 'claude-opus-5-5',
      loadSdk: async () => fake.Sdk,
    });

    let text = '';
    const result = await provider.streamChat(
      { system: 'SYS', messages: [{ role: 'user', content: 'q' }] },
      { onText: (t) => (text += t) },
    );

    expect(text).toBe('Hi there');
    expect(result).toEqual({ stopReason: 'end', servedBy: 'claude-opus-5-5' });
    expect(fake.FakeAnthropic.lastOptions).toMatchObject({
      apiKey: 'sk-ant-x',
      dangerouslyAllowBrowser: true,
    });
    expect(fake.calls[0]!.params).toMatchObject({
      model: 'claude-opus-5-5',
      system: [{ type: 'text', text: 'SYS' }],
      cache_control: { type: 'ephemeral' },
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  });

  it('omits effort and fallbacks for models that do not support them', async () => {
    const fake = fakeSdk([], { stop_reason: 'end_turn', model: 'claude-haiku-4-5' });
    await createAnthropic({
      apiKey: 'k',
      model: 'claude-haiku-4-5',
      loadSdk: async () => fake.Sdk,
    }).streamChat({ system: 's', messages: [] }, { onText: () => {} });
    expect(fake.calls[0]!.params).not.toHaveProperty('output_config');
    expect(fake.calls[0]!.params).not.toHaveProperty('fallbacks');
  });

  it('resets partial text when a fallback model takes over', async () => {
    const fake = fakeSdk(
      [
        textDelta('partial'),
        { type: 'content_block_start', content_block: { type: 'fallback' } },
        textDelta('final'),
      ],
      { stop_reason: 'end_turn', model: 'claude-opus-5' },
    );
    let text = '';
    const result = await createAnthropic({
      apiKey: 'k',
      model: 'claude-opus-5-5',
      loadSdk: async () => fake.Sdk,
    }).streamChat(
      { system: 's', messages: [] },
      { onText: (t) => (text += t), onReset: () => (text = '') },
    );
    expect(text).toBe('final');
    expect(result.servedBy).toBe('claude-opus-5');
  });

  it('reports refusals', async () => {
    const fake = fakeSdk([], { stop_reason: 'refusal', model: 'claude-haiku-5-5' });
    const result = await createAnthropic({
      apiKey: 'k',
      model: 'claude-haiku-5-5',
      loadSdk: async () => fake.Sdk,
    }).streamChat({ system: 's', messages: [] }, { onText: () => {} });
    expect(result.stopReason).toBe('refusal');
  });

  it('maps SDK errors to AiError kinds', async () => {
    const run = async (makeError: (e: ReturnType<typeof fakeSdk>['errors']) => Error) => {
      const probe = fakeSdk([], { stop_reason: 'end_turn', model: 'm' });
      const fake = fakeSdk([], { stop_reason: 'end_turn', model: 'm' }, makeError(probe.errors));
      // Errors must be instances of the same SDK classes the adapter checks against.
      Object.assign(fake.FakeAnthropic, probe.errors);
      return createAnthropic({ apiKey: 'k', model: 'm', loadSdk: async () => fake.Sdk })
        .streamChat({ system: 's', messages: [] }, { onText: () => {} })
        .then(
          () => {
            throw new Error('expected the request to fail');
          },
          (e: unknown) => e as AiError,
        );
    };
    expect((await run((e) => new e.APIError(401, 'bad key'))).kind).toBe('auth');
    expect((await run((e) => new e.APIError(429, 'slow down'))).kind).toBe('rate_limit');
    expect((await run((e) => new e.APIUserAbortError(undefined, 'aborted'))).kind).toBe('aborted');
    expect((await run((e) => new e.APIConnectionError(undefined, 'offline'))).kind).toBe('network');
  });
});

describe('model capability helpers', () => {
  it('detects effort support', () => {
    expect(supportsEffort('claude-opus-5-5')).toBe(true);
    expect(supportsEffort('claude-haiku-5-5')).toBe(true);
    expect(supportsEffort('claude-sonnet-5')).toBe(true);
    expect(supportsEffort('claude-haiku-4-5')).toBe(false);
  });

  it('detects server-side fallback support', () => {
    expect(supportsServerFallback('claude-opus-5-5')).toBe(true);
    expect(supportsServerFallback('claude-sonnet-5-5')).toBe(true);
    expect(supportsServerFallback('claude-haiku-5-5')).toBe(false);
  });
});
