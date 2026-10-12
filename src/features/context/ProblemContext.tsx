import { AlertTriangle, ExternalLink, Lock, RefreshCw, Unplug } from 'lucide-react';
import { Badge, DifficultyBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProblemState } from '@/lib/leetcode/active-problem';
import { CodeChip } from './CodeChip';
import { useProblemStore } from './problem-store';

const MAX_TAGS = 3;

/** Compact strip under the header describing the problem in the active tab. */
export function ProblemContext() {
  const state = useProblemStore((s) => s.state);
  return (
    <section aria-label="Current problem" className="shrink-0 border-b bg-surface/60 px-3 py-2.5">
      <ProblemContextBody state={state} />
    </section>
  );
}

export function ProblemContextBody({ state }: { state: ProblemState }) {
  const refresh = useProblemStore((s) => s.refresh);

  switch (state.status) {
    case 'idle':
    case 'loading':
      return (
        <div className="flex flex-col gap-2" aria-busy="true">
          <span className="sr-only">Loading problem</span>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
      );

    case 'no-problem':
      return (
        <div className="flex items-center justify-between gap-3">
          <p className="text-fg-secondary text-xs">
            {state.reason === 'contest'
              ? 'Synora is turned off during contests.'
              : 'Open a LeetCode problem to get started.'}
          </p>
          {state.reason !== 'contest' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => browser.tabs.create({ url: 'https://leetcode.com/problemset/' })}
            >
              Problems <ExternalLink />
            </Button>
          )}
        </div>
      );

    case 'disconnected':
      return (
        <StatusRow
          icon={<Unplug className="size-4 text-warning" aria-hidden />}
          message="Synora can't connect to this tab. Reload the page to reconnect."
          action={
            <Button size="sm" onClick={() => browser.tabs.reload(state.tabId)}>
              <RefreshCw /> Reload
            </Button>
          }
        />
      );

    case 'error':
      return (
        <StatusRow
          icon={<AlertTriangle className="size-4 text-error" aria-hidden />}
          message={state.message}
          action={
            <Button size="sm" onClick={() => void refresh({ force: true })}>
              <RefreshCw /> Retry
            </Button>
          }
        />
      );

    case 'ready': {
      const { problem } = state;
      const extraTags = problem.tags.length - MAX_TAGS;
      return (
        <div className="flex flex-col gap-1.5 animate-fade-in">
          <div className="flex items-start justify-between gap-2">
            <h2 className="min-w-0 font-medium text-fg text-sm leading-snug">
              {problem.frontendId && <span className="text-fg-muted">{problem.frontendId}. </span>}
              {problem.title}
            </h2>
            <CodeChip slug={problem.slug} tabId={state.tabId} />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <DifficultyBadge difficulty={problem.difficulty} />
            {problem.isPaidOnly && (
              <Badge tone="warning">
                <Lock className="size-3" aria-hidden /> Premium
              </Badge>
            )}
            {problem.tags.slice(0, MAX_TAGS).map((tag) => (
              <Badge key={tag.slug}>{tag.name}</Badge>
            ))}
            {extraTags > 0 && <Badge>+{extraTags}</Badge>}
          </div>
          {problem.isPaidOnly && !problem.description && (
            <p className="text-fg-muted text-xs">
              Description unavailable for this premium problem.
            </p>
          )}
        </div>
      );
    }
  }
}

function StatusRow({
  icon,
  message,
  action,
}: {
  icon: React.ReactNode;
  message: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3" role="status">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <p className="text-fg-secondary text-xs">{message}</p>
      </div>
      {action}
    </div>
  );
}
