import { QUICK_ACTIONS, type QuickAction } from '@/lib/ai/prompts/tutor';
import type { ExperienceLevel } from '@/lib/settings';

const ORDER: Record<ExperienceLevel, QuickAction[]> = {
  beginner: [
    'explain-problem',
    'explain-selection',
    'explain-code',
    'find-bug',
    'explain-algorithm',
    'walkthrough',
    'edge-cases',
    'complexity',
  ],
  intermediate: [
    'explain-selection',
    'find-bug',
    'review-approach',
    'complexity',
    'edge-cases',
    'walkthrough',
    'explain-algorithm',
    'explain-problem',
  ],
  advanced: [
    'explain-selection',
    'review-approach',
    'complexity',
    'edge-cases',
    'find-bug',
    'explain-algorithm',
  ],
};

interface QuickActionsProps {
  level: ExperienceLevel;
  hasCode: boolean;
  hasSelection: boolean;
  disabled: boolean;
  onAction(action: QuickAction): void;
}

export function QuickActions({
  level,
  hasCode,
  hasSelection,
  disabled,
  onAction,
}: QuickActionsProps) {
  const actions = ORDER[level].filter((action) => {
    const spec = QUICK_ACTIONS[action];
    if (spec.needsSelection) return hasSelection;
    if (spec.needsCode) return hasCode;
    return true;
  });

  return (
    <div
      className="flex gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none]"
      role="toolbar"
      aria-label="Quick actions"
    >
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          disabled={disabled}
          onClick={() => onAction(action)}
          className={
            action === 'explain-selection'
              ? 'h-6 shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2.5 text-[11px] text-accent transition-colors hover:bg-accent/20 disabled:opacity-50'
              : 'h-6 shrink-0 rounded-full border bg-elevated px-2.5 text-[11px] text-fg-secondary transition-colors hover:border-fg-muted/60 hover:text-fg disabled:opacity-50'
          }
        >
          {QUICK_ACTIONS[action].label}
        </button>
      ))}
    </div>
  );
}
