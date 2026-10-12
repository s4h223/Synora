import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/db/schema';

export function ProgressTab() {
  const stats = useLiveQuery(async () => {
    const [problems, visits] = await Promise.all([
      db.problems.count(),
      db.events.where('type').equals('problem_opened').count(),
    ]);
    return { problems, visits };
  });

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-2 p-3" aria-busy="true">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (stats.problems === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No activity yet"
        description="Your progress builds as you work on problems. Everything is stored locally in your browser."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 animate-fade-in">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Problems opened" value={stats.problems} />
        <Stat label="Practice visits" value={stats.visits} />
      </div>
      <p className="text-fg-muted text-xs">
        Hints, challenges and mistake tracking will appear here as those features ship.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-surface p-3">
      <span className="font-semibold text-fg text-xl tabular-nums">{value}</span>
      <span className="text-fg-secondary text-xs">{label}</span>
    </div>
  );
}
