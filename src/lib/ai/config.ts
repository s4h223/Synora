import { storage } from 'wxt/utils/storage';
import { z } from 'zod/mini';
import { getPreset, type ProviderId } from './catalog';

const providerIdSchema = z.enum([
  'anthropic',
  'openai',
  'gemini',
  'groq',
  'openrouter',
  'ollama',
  'custom',
  'demo',
]);

const providerSettingsSchema = z.object({
  apiKey: z.optional(z.string()),
  baseUrl: z.optional(z.string()),
  model: z.optional(z.string()),
});
export type ProviderSettings = z.infer<typeof providerSettingsSchema>;

const aiConfigSchema = z.object({
  activeProvider: z.nullable(providerIdSchema),
  /** Per-provider settings, so switching providers doesn't lose a saved key. */
  providers: z.partialRecord(providerIdSchema, providerSettingsSchema),
});
export type AiConfig = z.infer<typeof aiConfigSchema>;

export const DEFAULT_AI_CONFIG: AiConfig = { activeProvider: null, providers: {} };

/**
 * Stored in chrome.storage.local (never .sync). The key is not encrypted at rest;
 * that's standard for bring-your-own-key extensions and documented in PRIVACY.md.
 */
export const aiConfigItem = storage.defineItem<AiConfig>('local:ai-config', {
  fallback: DEFAULT_AI_CONFIG,
  version: 1,
});

export function sanitizeAiConfig(value: unknown): AiConfig {
  const parsed = aiConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_AI_CONFIG;
}

export async function getAiConfig(): Promise<AiConfig> {
  return sanitizeAiConfig(await aiConfigItem.getValue());
}

export async function saveProviderSettings(
  id: ProviderId,
  settings: ProviderSettings,
  activate = true,
): Promise<AiConfig> {
  const current = await getAiConfig();
  const next: AiConfig = {
    activeProvider: activate ? id : current.activeProvider,
    providers: { ...current.providers, [id]: settings },
  };
  await aiConfigItem.setValue(next);
  return next;
}

export async function clearAiConfig(): Promise<void> {
  await aiConfigItem.setValue(DEFAULT_AI_CONFIG);
}

export interface ResolvedProvider {
  id: ProviderId;
  protocol: 'anthropic' | 'openai';
  baseUrl: string;
  apiKey: string | undefined;
  model: string;
}

/** The active provider with everything needed to make a request, or null if incomplete. */
export function resolveActiveProvider(config: AiConfig): ResolvedProvider | null {
  const id = config.activeProvider;
  if (!id) return null;
  const preset = getPreset(id);
  const settings = config.providers[id] ?? {};
  const baseUrl = (preset.baseUrl ?? settings.baseUrl ?? '').trim().replace(/\/+$/, '');
  const apiKey = settings.apiKey?.trim() || undefined;
  const model = settings.model?.trim() ?? '';

  if (!baseUrl || !model) return null;
  if (preset.requiresKey && !apiKey) return null;
  return { id, protocol: preset.protocol, baseUrl, apiKey, model };
}

/** Mask a key for display: keep a short prefix and the last 4 characters. */
export function maskKey(key: string): string {
  if (key.length <= 10) return '••••';
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}
