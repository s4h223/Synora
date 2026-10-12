import { MessageSquareText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { RequiresProblem } from '../context/RequiresProblem';

export function CoachTab() {
  return (
    <RequiresProblem>
      <EmptyState
        icon={MessageSquareText}
        title="Coach"
        description="A tutor that knows this problem and your code. It starts with gentle nudges and only reveals more when you ask."
        action={<Badge tone="accent">In development</Badge>}
      />
    </RequiresProblem>
  );
}
