import { createAnthropic } from './anthropic';
import type { ResolvedProvider } from './config';
import { createDemoProvider } from './demo';
import { createOpenAiCompatible } from './openai-compatible';
import { AiError, type AiProvider } from './types';

export function createProvider(resolved: ResolvedProvider): AiProvider {
  if (resolved.id === 'demo') return createDemoProvider();
  if (resolved.protocol === 'anthropic') {
    if (!resolved.apiKey) throw new AiError('config', 'Missing API key');
    return createAnthropic({
      apiKey: resolved.apiKey,
      model: resolved.model,
      baseUrl: resolved.baseUrl,
    });
  }
  return createOpenAiCompatible({
    baseUrl: resolved.baseUrl,
    apiKey: resolved.apiKey,
    model: resolved.model,
  });
}
