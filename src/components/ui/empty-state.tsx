import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-10 text-center animate-fade-in',
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-xl border bg-surface text-accent">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="flex max-w-72 flex-col gap-1">
        <h2 className="font-medium text-fg text-sm">{title}</h2>
        {description && <p className="text-fg-secondary text-xs leading-relaxed">{description}</p>}
      </div>
      {action}
    </div>
  );
}
