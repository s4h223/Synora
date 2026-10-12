import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  getSettings,
  type Settings,
  sanitizeSettings,
  settingsItem,
  updateSettings,
} from '@/lib/settings';

/** Live view of settings, kept in sync across extension pages via storage events. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getSettings().then((value) => {
      if (!active) return;
      setSettings(value);
      setLoaded(true);
    });
    const unwatch = settingsItem.watch((value) => setSettings(sanitizeSettings(value)));
    return () => {
      active = false;
      unwatch();
    };
  }, []);

  const update = useCallback(async (patch: Partial<Settings>) => {
    setSettings(await updateSettings(patch));
  }, []);

  return { settings, loaded, update };
}
