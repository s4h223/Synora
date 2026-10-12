import { storage } from 'wxt/utils/storage';
import { z } from 'zod/mini';

/**
 * Code access policy:
 * - off:  never read the editor (manual paste still works)
 * - ask:  read only when the user clicks "Read from editor" / confirms per request
 * - auto: attach current code automatically when sending a request (Phase 2)
 */
export const codeAccessSchema = z.enum(['off', 'ask', 'auto']);
export type CodeAccess = z.infer<typeof codeAccessSchema>;

export const settingsSchema = z.object({
  codeAccess: codeAccessSchema,
  /** Record learning events (problem opened, hints, …) locally for Progress. */
  sessionTracking: z.boolean(),
  onboardingComplete: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  codeAccess: 'ask',
  sessionTracking: true,
  onboardingComplete: false,
};

export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 1,
});

/** Merge stored values over defaults, dropping anything invalid (e.g. from an older version). */
export function sanitizeSettings(value: unknown): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...(typeof value === 'object' && value ? value : {}) };
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function getSettings(): Promise<Settings> {
  return sanitizeSettings(await settingsItem.getValue());
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = sanitizeSettings({ ...(await getSettings()), ...patch });
  await settingsItem.setValue(next);
  return next;
}
