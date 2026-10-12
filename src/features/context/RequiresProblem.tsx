import { MousePointerClick } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { useProblemStore } from './problem-store';

/** Render children only when a problem is loaded; otherwise explain what's needed. */
export function RequiresProblem({ children }: { children: ReactNode }) {
  const status = useProblemStore((s) => s.state.status);
  if (status === 'ready') return <>{children}</>;
  if (status === 'idle' || status === 'loading') return null;
  return (
    <EmptyState
      icon={MousePointerClick}
      title="No problem open"
      description="Open any problem on leetcode.com and Synora will pick it up automatically."
    />
  );
}
