import { Swords } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { RequiresProblem } from '../context/RequiresProblem';

export function ChallengeTab() {
  return (
    <RequiresProblem>
      <EmptyState
        icon={Swords}
        title="Break my code"
        description="Synora runs your solution against a trusted reference on tricky inputs, entirely in your browser, and asks you to predict what happens."
        action={<Badge tone="accent">In development</Badge>}
      />
    </RequiresProblem>
  );
}
