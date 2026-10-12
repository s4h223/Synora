import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  getAiConfig,
  maskKey,
  resolveActiveProvider,
  sanitizeAiConfig,
  saveProviderSettings,
} from './config';
import { originPattern } from './permissions';

beforeEach(() => fakeBrowser.reset());

describe('AI config', () => {
  it('starts unconfigured', async () => {
    expect(await getAiConfig()).toEqual({ activeProvider: null, providers: {} });
    expect(resolveActiveProvider(await getAiConfig())).toBeNull();
  });

  it('saves per-provider settings and activates the provider', async () => {
    await saveProviderSettings('groq', { apiKey: 'gsk_1', model: 'llama' });
    await saveProviderSettings('anthropic', { apiKey: ' sk-ant ', model: 'claude-haiku-5-5' });
    const config = await getAiConfig();
    expect(config.activeProvider).toBe('anthropic');
    expect(config.providers.groq?.apiKey).toBe('gsk_1');
    expect(resolveActiveProvider(config)).toEqual({
      id: 'anthropic',
      protocol: 'anthropic',
      baseUrl: 'https://api.anthropic.com',
      apiKey: 'sk-ant',
      model: 'claude-haiku-5-5',
    });
  });

  it('requires a key for hosted providers but not for Ollama', () => {
    expect(
      resolveActiveProvider({ activeProvider: 'openai', providers: { openai: { model: 'm' } } }),
    ).toBeNull();
    expect(
      resolveActiveProvider({
        activeProvider: 'ollama',
        providers: { ollama: { baseUrl: 'http://localhost:11434/v1/', model: 'qwen' } },
      }),
    ).toMatchObject({ baseUrl: 'http://localhost:11434/v1', apiKey: undefined });
  });

  it('requires a model', () => {
    expect(
      resolveActiveProvider({ activeProvider: 'gemini', providers: { gemini: { apiKey: 'k' } } }),
    ).toBeNull();
  });

  it('discards corrupted stored config', () => {
    expect(sanitizeAiConfig({ activeProvider: 'skynet', providers: 3 })).toEqual({
      activeProvider: null,
      providers: {},
    });
  });

  it('masks keys for display', () => {
    expect(maskKey('sk-ant-api03-abcdefghijklmnop')).toBe('sk-ant…mnop');
    expect(maskKey('short')).toBe('••••');
  });
});

describe('originPattern', () => {
  it('builds host-scoped patterns', () => {
    expect(originPattern('https://api.groq.com/openai/v1')).toBe('https://api.groq.com/*');
    expect(originPattern('http://localhost:11434/v1')).toBe('http://localhost/*');
    expect(originPattern('http://127.0.0.1:1234')).toBe('http://127.0.0.1/*');
  });

  it('refuses plain http to remote hosts and invalid URLs', () => {
    expect(originPattern('http://example.com/v1')).toBeNull();
    expect(originPattern('not a url')).toBeNull();
    expect(originPattern('ftp://example.com')).toBeNull();
  });
});
