export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  /** Stable instructions + problem context. Kept identical across turns so it can be cached. */
  system: string;
  messages: ChatTurn[];
  signal?: AbortSignal;
}

export interface StreamHandlers {
  /** Incremental text from the model. */
  onText(delta: string): void;
  /**
   * The provider discarded what it streamed so far (e.g. a server-side model
   * fallback took over mid-response). The UI should clear the partial text.
   */
  onReset?(): void;
}

export interface ChatResult {
  stopReason: 'end' | 'max_tokens' | 'refusal' | 'other';
  /** The model that actually produced the answer, when the provider reports it. */
  servedBy?: string;
}

export interface AiProvider {
  streamChat(request: ChatRequest, handlers: StreamHandlers): Promise<ChatResult>;
  /** Model ids available to this key, when the provider exposes a listing. */
  listModels?(signal?: AbortSignal): Promise<string[]>;
}

export type AiErrorKind =
  | 'auth'
  | 'permission'
  | 'rate_limit'
  | 'bad_request'
  | 'not_found'
  | 'server'
  | 'network'
  | 'aborted'
  | 'config';

const FRIENDLY: Record<AiErrorKind, string> = {
  auth: 'The API key was rejected. Check it in Settings → AI.',
  permission: 'This key or account isn’t allowed to use that model.',
  rate_limit: 'The provider is rate-limiting requests. Wait a moment and try again.',
  bad_request: 'The provider rejected the request.',
  not_found: 'The model wasn’t found. Pick another model in Settings → AI.',
  server: 'The provider had a server error. Try again shortly.',
  network: 'Couldn’t reach the provider. Check your connection and that Synora has access.',
  aborted: 'Stopped.',
  config: 'AI isn’t set up yet.',
};

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    /** Provider detail, shown under the friendly message. Never contains the API key. */
    readonly detail?: string,
  ) {
    super(FRIENDLY[kind]);
    this.name = 'AiError';
  }
}

export function kindForStatus(status: number): AiErrorKind {
  if (status === 401) return 'auth';
  if (status === 403) return 'permission';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  return 'bad_request';
}
