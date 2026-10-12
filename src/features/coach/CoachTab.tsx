import { KeyRound, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useProblemStore } from '../context/problem-store';
import { RequiresProblem } from '../context/RequiresProblem';
import { useAiConfig } from '../settings/use-ai-config';
import { useUiStore } from '../shell/ui-store';
import { CoachChat } from './CoachChat';

export function CoachTab() {
  const { ready, loaded } = useAiConfig();
  const problem = useProblemStore((s) => (s.state.status === 'ready' ? s.state.problem : null));
  const openSettings = useUiStore((s) => s.openSettings);

  return (
    <RequiresProblem>
      {!loaded ? null : ready && problem ? (
        <CoachChat problem={problem} />
      ) : (
        <EmptyState
          icon={Sparkles}
          title="Connect an AI to start"
          description="Synora's tutor runs on an AI provider you choose: a free local model, a free-tier key, or a paid key. Your key stays in this browser."
          action={
            <Button variant="primary" onClick={() => openSettings('ai')}>
              <KeyRound /> Set up AI
            </Button>
          }
        />
      )}
    </RequiresProblem>
  );
}
