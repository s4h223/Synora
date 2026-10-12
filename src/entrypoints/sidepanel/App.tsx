import { useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePairMode } from '@/features/coach/use-pair-mode';
import { ProblemContext } from '@/features/context/ProblemContext';
import { useProblemStore, watchActiveTab } from '@/features/context/problem-store';
import { useLiveSync } from '@/features/context/use-live-sync';
import { WelcomeView } from '@/features/onboarding/WelcomeView';
import { SettingsView } from '@/features/settings/SettingsView';
import { useAiConfig } from '@/features/settings/use-ai-config';
import { useSettings } from '@/features/settings/use-settings';
import { Header } from '@/features/shell/Header';
import { MainTabs } from '@/features/shell/MainTabs';
import { useUiStore } from '@/features/shell/ui-store';
import type { Problem } from '@/lib/leetcode/types';

export function App() {
  const view = useUiStore((s) => s.view);
  const openSettings = useUiStore((s) => s.openSettings);
  const closeSettings = useUiStore((s) => s.closeSettings);
  const { settings, loaded } = useSettings();
  const problem = useProblemStore((s) => (s.state.status === 'ready' ? s.state.problem : null));

  useEffect(() => watchActiveTab(), []);
  useLiveSync();

  const onboarding = loaded && !settings.onboardingComplete && view === 'main';

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-bg">
        <Header view={view} onOpenSettings={() => openSettings()} onBack={closeSettings} />
        {problem && <PairModeRunner problem={problem} />}
        {view === 'settings' ? (
          <SettingsView />
        ) : onboarding ? (
          <WelcomeView />
        ) : (
          <>
            <ProblemContext />
            <MainTabs />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

/** Pair mode keeps watching even when another tab (Progress, Challenge…) is open. */
function PairModeRunner({ problem }: { problem: Problem }) {
  const { ready } = useAiConfig();
  usePairMode(problem, ready);
  return null;
}
