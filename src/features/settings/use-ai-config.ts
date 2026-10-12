import { useEffect, useState } from 'react';
import {
  type AiConfig,
  aiConfigItem,
  DEFAULT_AI_CONFIG,
  getAiConfig,
  resolveActiveProvider,
  sanitizeAiConfig,
} from '@/lib/ai/config';

/** Live view of the AI configuration (synced across extension pages). */
export function useAiConfig() {
  const [config, setConfig] = useState<AiConfig>(DEFAULT_AI_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getAiConfig().then((value) => {
      if (!active) return;
      setConfig(value);
      setLoaded(true);
    });
    const unwatch = aiConfigItem.watch((value) => setConfig(sanitizeAiConfig(value)));
    return () => {
      active = false;
      unwatch();
    };
  }, []);

  const resolved = resolveActiveProvider(config);
  return { config, loaded, resolved, ready: resolved !== null };
}
