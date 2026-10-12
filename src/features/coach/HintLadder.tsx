import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { HINT_INSTRUCTIONS, type HintLevel } from '@/lib/ai/prompts/tutor';
import { cn } from '@/lib/utils';

const LABELS = ['Nudge', 'Direction', 'Plan', 'Solution'];

interface HintLadderProps {
  /** Highest hint level used in this conversation (0 = none). */
  level: number;
  disabled: boolean;
  onHint(level: HintLevel, instruction: string): void;
}

/** Progressive hints: each click reveals a little more. The full solution needs confirmation. */
export function HintLadder({ level, disabled, onHint }: HintLadderProps) {
  const next = Math.min(level + 1, 4) as HintLevel;
  const request = () => onHint(next, HINT_INSTRUCTIONS[next]);

  return (
    <div className="flex items-center justify-between gap-3 px-3 pt-2">
      <div className="flex items-center gap-1" role="img" aria-label={`Hints used: ${level} of 4`}>
        {LABELS.map((label, i) => (
          <span
            key={label}
            title={label}
            className={cn(
              'h-1 w-5 rounded-full transition-colors',
              i < level ? (i === 3 ? 'bg-warning' : 'bg-accent') : 'bg-border',
            )}
          />
        ))}
        <span className="ml-1.5 text-[11px] text-fg-muted">
          {level === 0 ? 'No hints yet' : `${LABELS[level - 1]} shown`}
        </span>
      </div>
      {next === 4 ? (
        <ConfirmDialog
          title="Show the full solution?"
          description="Seeing the answer is fine when you're truly stuck. You'll learn more if you try once more first, and re-solving it later without help is the best way to make it stick."
          confirmLabel="Show solution"
          onConfirm={request}
          trigger={
            <Button size="sm" variant="ghost" disabled={disabled}>
              <Lightbulb /> Solution
            </Button>
          }
        />
      ) : (
        <Button size="sm" variant="ghost" disabled={disabled} onClick={request}>
          <Lightbulb /> {level === 0 ? 'Hint' : 'Next hint'}
        </Button>
      )}
    </div>
  );
}
