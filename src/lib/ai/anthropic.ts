import type Anthropic from '@anthropic-ai/sdk';
import { AiError, type AiProvider, type ChatResult, kindForStatus } from './types';

interface AnthropicOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  /** Injected in tests. */
  loadSdk?: () => Promise<typeof Anthropic>;
}

/** Generous ceiling: the model stops on its own long before this for tutoring replies. */
const MAX_TOKENS = 16_000;

/** Models that accept `output_config.effort`. Older models reject it. */
export function supportsEffort(model: string): boolean {
  return /^claude-(opus|sonnet|haiku|fable|mythos)-5(\b|-)/.test(model);
}

/**
 * Models with server-side refusal fallbacks (`fallbacks: "default"`): a request a
 * safety classifier declines is re-run on a fallback model instead of failing.
 */
export function supportsServerFallback(model: string): boolean {
  return ['claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5', 'claude-fable-5-1'].includes(
    model,
  );
}

/**
 * Claude via the official SDK, loaded lazily so users of other providers don't
 * pay for it. Runs in the browser with the user's own key (bring-your-own-key),
 * which is what `dangerouslyAllowBrowser` permits.
 */
export function createAnthropic({
  apiKey,
  model,
  baseUrl,
  loadSdk = () => import('@anthropic-ai/sdk').then((m) => m.default),
}: AnthropicOptions): AiProvider {
  let clientPromise: Promise<{ client: Anthropic; sdk: typeof Anthropic }> | undefined;
  const getClient = () => {
    clientPromise ??= loadSdk().then((Sdk) => ({
      sdk: Sdk,
      client: new Sdk({
        apiKey,
        dangerouslyAllowBrowser: true,
        maxRetries: 2,
        ...(baseUrl ? { baseURL: baseUrl } : {}),
      }),
    }));
    return clientPromise;
  };

  return {
    async streamChat(req, handlers): Promise<ChatResult> {
      const { client, sdk } = await getClient();
      try {
        const stream = client.beta.messages.stream(
          {
            model,
            max_tokens: MAX_TOKENS,
            system: [{ type: 'text', text: req.system }],
            messages: req.messages,
            // Caches the stable system prompt + problem across turns.
            cache_control: { type: 'ephemeral' },
            ...(supportsEffort(model) ? { output_config: { effort: 'medium' as const } } : {}),
            ...(supportsServerFallback(model)
              ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
              : {}),
          },
          { signal: req.signal },
        );

        for await (const event of stream) {
          if (event.type === 'content_block_start' && event.content_block.type === 'fallback') {
            // A fallback model took over; what was streamed so far is discarded.
            handlers.onReset?.();
          } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            handlers.onText(event.delta.text);
          }
        }

        const final = await stream.finalMessage();
        return {
          stopReason:
            final.stop_reason === 'end_turn'
              ? 'end'
              : final.stop_reason === 'max_tokens'
                ? 'max_tokens'
                : final.stop_reason === 'refusal'
                  ? 'refusal'
                  : 'other',
          servedBy: final.model,
        };
      } catch (error) {
        throw toAiError(error, sdk);
      }
    },

    async listModels(): Promise<string[]> {
      const { client, sdk } = await getClient();
      try {
        const ids: string[] = [];
        for await (const m of client.models.list()) ids.push(m.id);
        return ids;
      } catch (error) {
        throw toAiError(error, sdk);
      }
    },
  };
}

function toAiError(error: unknown, sdk: typeof Anthropic): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof sdk.APIUserAbortError) return new AiError('aborted');
  if (error instanceof sdk.APIConnectionError) return new AiError('network', error.message);
  if (error instanceof sdk.APIError && typeof error.status === 'number') {
    return new AiError(kindForStatus(error.status), error.message.slice(0, 300));
  }
  return new AiError('network', error instanceof Error ? error.message : String(error));
}
