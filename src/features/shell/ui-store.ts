import { create } from 'zustand';

export type View = 'main' | 'settings';
export type TabId = 'coach' | 'live' | 'challenge' | 'progress';
export type SettingsSection = 'ai' | 'learning' | 'privacy' | 'voice';

interface UiStore {
  view: View;
  tab: TabId;
  /** Section to scroll to when settings open. */
  settingsSection: SettingsSection | null;
  setTab(tab: TabId): void;
  openSettings(section?: SettingsSection): void;
  closeSettings(): void;
}

export const useUiStore = create<UiStore>((set) => ({
  view: 'main',
  tab: 'coach',
  settingsSection: null,
  setTab: (tab) => set({ tab }),
  openSettings: (section) => set({ view: 'settings', settingsSection: section ?? null }),
  closeSettings: () => set({ view: 'main', settingsSection: null }),
}));
