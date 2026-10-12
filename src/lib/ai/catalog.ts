export type ProviderProtocol = 'anthropic' | 'openai';

export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'ollama'
  | 'custom'
  | 'demo';

export interface ProviderPreset {
  id: ProviderId;
  label: string;
  protocol: ProviderProtocol;
  /** Fixed base URL; null when the user must supply one. */
  baseUrl: string | null;
  defaultBaseUrl?: string;
  requiresKey: boolean;
  /** Suggested model ids. Empty means "load the list from the provider". */
  suggestedModels: string[];
  keyUrl?: string;
  /** One-line note shown under the provider choice. */
  note: string;
  /** Shown as a warning: data from free tiers may be used for training. */
  freeTierWarning?: boolean;
  cost: 'paid' | 'free-tier' | 'local';
}

/**
 * Model ids are deliberately only hardcoded for Anthropic. For other providers
 * Synora lists models from the provider's /models endpoint so the catalog
 * never goes stale.
 */
export const PROVIDERS: ProviderPreset[] = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    requiresKey: true,
    suggestedModels: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
    keyUrl: 'https://console.anthropic.com/settings/keys',
    note: 'Paid API. Claude Haiku 5.5 is the lowest-cost option.',
    cost: 'paid',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    requiresKey: true,
    suggestedModels: [],
    keyUrl: 'https://platform.openai.com/api-keys',
    note: 'Paid API.',
    cost: 'paid',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    protocol: 'openai',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    requiresKey: true,
    suggestedModels: [],
    keyUrl: 'https://aistudio.google.com/apikey',
    note: 'Has a rate-limited free tier.',
    freeTierWarning: true,
    cost: 'free-tier',
  },
  {
    id: 'groq',
    label: 'Groq',
    protocol: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    requiresKey: true,
    suggestedModels: [],
    keyUrl: 'https://console.groq.com/keys',
    note: 'Fast open models with a rate-limited free tier.',
    freeTierWarning: true,
    cost: 'free-tier',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    protocol: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresKey: true,
    suggestedModels: [],
    keyUrl: 'https://openrouter.ai/keys',
    note: 'Many models; ones ending in ":free" cost nothing but are rate-limited.',
    freeTierWarning: true,
    cost: 'free-tier',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    protocol: 'openai',
    baseUrl: null,
    defaultBaseUrl: 'http://localhost:11434/v1',
    requiresKey: false,
    suggestedModels: [],
    note: 'Runs on your computer: free and private. Needs a capable machine.',
    cost: 'local',
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    protocol: 'openai',
    baseUrl: null,
    defaultBaseUrl: 'https://',
    requiresKey: false,
    suggestedModels: [],
    note: 'Any server that implements the OpenAI chat completions API, e.g. LM Studio.',
    cost: 'local',
  },
  {
    id: 'demo',
    label: 'Demo (scripted, dev builds only)',
    protocol: 'openai',
    baseUrl: 'demo://local',
    requiresKey: false,
    suggestedModels: ['demo-tutor'],
    note: 'Canned replies for testing the UI without a key. Not a real model.',
    cost: 'local',
  },
];

/** Providers offered in the UI. The demo provider only exists in development builds. */
export function visibleProviders(dev = import.meta.env.DEV): ProviderPreset[] {
  return PROVIDERS.filter((p) => p.id !== 'demo' || dev);
}

export function getPreset(id: ProviderId): ProviderPreset {
  const preset = PROVIDERS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown provider ${id}`);
  return preset;
}
