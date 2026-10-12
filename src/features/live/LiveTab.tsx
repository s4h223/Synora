import { AudioLines } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

export function LiveTab() {
  return (
    <EmptyState
      icon={AudioLines}
      title="Synora Live"
      description="Talk through your thinking out loud, as a tutor session, a rubber duck, or a mock interview."
      action={<Badge tone="accent">In development</Badge>}
    />
  );
}
