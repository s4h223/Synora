import { useEffect, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ProblemContext } from '@/features/context/ProblemContext';
import { watchActiveTab } from '@/features/context/problem-store';
import { SettingsView } from '@/features/settings/SettingsView';
import { Header } from '@/features/shell/Header';
import { MainTabs } from '@/features/shell/MainTabs';

export function App() {
  const [view, setView] = useState<'main' | 'settings'>('main');

  useEffect(() => watchActiveTab(), []);

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-bg">
        <Header
          view={view}
          onOpenSettings={() => setView('settings')}
          onBack={() => setView('main')}
        />
        {view === 'settings' ? (
          <SettingsView />
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
