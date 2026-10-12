import { storage } from 'wxt/utils/storage';
import { z } from 'zod/mini';

/**
 * Code access policy. Reading code is always local; it only leaves the browser
 * when the user sends an AI request (or Pair mode is on).
 * - off:  never read the editor (manual paste still works)
 * - ask:  read only when the user clicks "Read from editor"
 * - live: mirror the editor as the user types
 */
export const codeAccessSchema = z.enum(['off', 'ask', 'live']);
export type CodeAccess = z.infer<typeof codeAccessSchema>;

/** Shapes how much Synora explains: beginners get syntax, terms and smaller steps. */
export const experienceLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type ExperienceLevel = z.infer<typeof experienceLevelSchema>;

/**
 * Pair mode: Synora watches live code and speaks up on its own when you pause.
 * Each check is an AI request, so it's opt-in.
 * - off:    only answers when asked
 * - quiet:  speaks up only for likely bugs or when you seem stuck
 * - active: also offers tips, explanations and encouragement
 */
export const pairModeSchema = z.enum(['off', 'quiet', 'active']);
export type PairMode = z.infer<typeof pairModeSchema>;

export const settingsSchema = z.object({
  codeAccess: codeAccessSchema,
  experienceLevel: experienceLevelSchema,
  pairMode: pairModeSchema,
  /** Record learning events (problem opened, hints, …) locally for Progress. */
  sessionTracking: z.boolean(),
  onboardingComplete: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  codeAccess: 'ask',
  experienceLevel: 'intermediate',
  pairMode: 'off',
  sessionTracking: true,
  onboardingComplete: false,
};

export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 1,
});

/** Merge stored values over defaults, dropping invalid fields individually. */
export function sanitizeSettings(value: unknown): Settings {
  if (typeof value !== 'object' || value === null) return DEFAULT_SETTINGS;
  const stored = { ...(value as Record<string, unknown>) };
  // Phase 1 called live-ish mode "auto".
  if (stored.codeAccess === 'auto') stored.codeAccess = 'live';

  const result: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const field = settingsSchema.shape[key];
    if (field.safeParse(stored[key]).success) result[key] = stored[key];
  }
  return result as Settings;
}

export async function getSettings(): Promise<Settings> {
  return sanitizeSettings(await settingsItem.getValue());
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = sanitizeSettings({ ...(await getSettings()), ...patch });
  await settingsItem.setValue(next);
  return next;
}
