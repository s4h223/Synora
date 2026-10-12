import { fakeBrowser } from 'wxt/testing/fake-browser';
import { DEFAULT_SETTINGS, getSettings, sanitizeSettings, updateSettings } from './settings';

beforeEach(() => {
  fakeBrowser.reset();
});

describe('settings', () => {
  it('defaults to asking before reading code', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.codeAccess).toBe('ask');
  });

  it('persists updates', async () => {
    await updateSettings({ codeAccess: 'off' });
    expect((await getSettings()).codeAccess).toBe('off');
    expect((await getSettings()).sessionTracking).toBe(true);
  });

  it('fills in missing fields from defaults', () => {
    expect(sanitizeSettings({ codeAccess: 'live', pairMode: 'quiet' })).toEqual({
      ...DEFAULT_SETTINGS,
      codeAccess: 'live',
      pairMode: 'quiet',
    });
  });

  it('migrates the Phase 1 "auto" code access to "live"', () => {
    expect(sanitizeSettings({ codeAccess: 'auto' }).codeAccess).toBe('live');
  });

  it('drops invalid fields individually and keeps valid ones', () => {
    expect(sanitizeSettings({ codeAccess: 'always', experienceLevel: 'beginner' })).toEqual({
      ...DEFAULT_SETTINGS,
      experienceLevel: 'beginner',
    });
  });

  it('falls back to defaults on invalid stored data', () => {
    expect(sanitizeSettings('garbage')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});
