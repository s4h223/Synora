import { readSse } from './sse';
import {
  AiError,
  type AiProvider,
  type ChatRequest,
  type ChatResult,
  kindForStatus,
  type StreamHandlers,
} from './types';

interface OpenAiCompatibleOptions {
  baseUrl: string;
  apiKey?: string | undefined;
  model: string;
  fetchImpl?: typeof fetch;
}

/**
 * Adapter for the OpenAI Chat Completions wire protocol, which OpenAI, Gemini,
 * Groq, OpenRouter, Ollama, LM Studio and many others implement.
 */
export function createOpenAiCompatible({
  baseUrl,
  apiKey,
  model,
  fetchImpl = (...args) => fetch(...args),
}: OpenAiCompatibleOptions): AiProvider {
  const headers = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  });

  async function request(path: string, init: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, init);
    } catch (error) {
      throw toAiError(error, init.signal);
    }
    if (!res.ok) throw new AiError(kindForStatus(res.status), await readErrorDetail(res));
    return res;
  }

  return {
    async streamChat(req: ChatRequest, handlers: StreamHandlers): Promise<ChatResult> {
      const res = await request('/chat/completions', {
        method: 'POST',
        headers: headers(),
        signal: req.signal ?? null,
        body: JSON.stringify({
          model,
          stream: true,
          messages: [{ role: 'system', content: req.system }, ...req.messages],
        }),
      });
      if (!res.body) throw new AiError('server', 'Empty response body');

      let finish: string | null = null;
      let servedBy: string | undefined;
      try {
        for await (const message of readSse(res.body)) {
          if (message.data === '[DONE]') break;
          let chunk: OpenAiChunk;
          try {
            chunk = JSON.parse(message.data) as OpenAiChunk;
          } catch {
            continue; // ignore non-JSON keep-alives some proxies send
          }
          if (chunk.error) {
            throw new AiError('server', chunk.error.message ?? 'Provider stream error');
          }
          if (chunk.model) servedBy = chunk.model;
          const choice = chunk.choices?.[0];
          const text = choice?.delta?.content;
          if (typeof text === 'string' && text) handlers.onText(text);
          if (choice?.finish_reason) finish = choice.finish_reason;
        }
      } catch (error) {
        if (error instanceof AiError) throw error;
        throw toAiError(error, req.signal);
      }

      const result: ChatResult = {
        stopReason:
          finish === 'length'
            ? 'max_tokens'
            : finish === 'content_filter'
              ? 'refusal'
              : finish === 'stop' || finish === null
                ? 'end'
                : 'other',
      };
      if (servedBy) result.servedBy = servedBy;
      return result;
    },

    async listModels(signal?: AbortSignal): Promise<string[]> {
      const res = await request('/models', { headers: headers(), signal: signal ?? null });
      const body = (await res.json().catch(() => null)) as {
        data?: { id?: unknown }[];
        models?: { id?: unknown; name?: unknown }[];
      } | null;
      const items = body?.data ?? body?.models ?? [];
      return items
        .map((m) => (typeof m.id === 'string' ? m.id : ''))
        .map((id) => id.replace(/^models\//, ''))
        .filter(Boolean)
        .sort();
    },
  };
}

interface OpenAiChunk {
  model?: string;
  choices?: { delta?: { content?: unknown }; finish_reason?: string | null }[];
  error?: { message?: string };
}

async function readErrorDetail(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const body = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    const message =
      typeof body.error === 'string' ? body.error : (body.error?.message ?? body.message);
    if (message) return message.slice(0, 300);
  } catch {
    // not JSON
  }
  return text.slice(0, 300) || `HTTP ${res.status}`;
}

function toAiError(error: unknown, signal: AbortSignal | null | undefined): AiError {
  if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
    return new AiError('aborted');
  }
  return new AiError('network', error instanceof Error ? error.message : String(error));
}
