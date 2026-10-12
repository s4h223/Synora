import { GraduationCap } from 'lucide-react';
import { QUICK_ACTIONS, type QuickAction } from '@/lib/ai/prompts/tutor';
import type { ExperienceLevel } from '@/lib/settings';

const SUGGESTIONS: Record<ExperienceLevel, QuickAction[]> = {
  beginner: ['explain-problem', 'explain-algorithm', 'explain-code'],
  intermediate: ['explain-problem', 'review-approach', 'edge-cases'],
  advanced: ['review-approach', 'complexity', 'edge-cases'],
};

const INTRO: Record<ExperienceLevel, string> = {
  beginner:
    'New to this? No problem. Ask anything, even “what does this line mean?” Synora explains step by step and never makes you feel behind.',
  intermediate:
    'Ask about the problem, your approach, or any syntax you need. Hints come one step at a time.',
  advanced:
    'Ask for a review, complexity check, or edge cases. Hints stay minimal unless you want more.',
};

interface WelcomeSuggestionsProps {
  level: ExperienceLevel;
  hasCode: boolean;
  onAction(action: QuickAction): void;
}

export function WelcomeSuggestions({ level, hasCode, onAction }: WelcomeSuggestionsProps) {
  const actions = SUGGESTIONS[level].filter((a) => hasCode || !QUICK_ACTIONS[a].needsCode);
  return (
    <div className="flex flex-col gap-4 py-4 animate-fade-in">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-9 items-center justify-center rounded-xl border bg-surface text-accent">
          <GraduationCap className="size-5" aria-hidden />
        </div>
        <p className="max-w-72 text-fg-secondary text-xs leading-relaxed">{INTRO[level]}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action)}
            className="rounded-lg border bg-surface px-3 py-2 text-left text-[13px] text-fg-secondary transition-colors hover:border-accent/40 hover:text-fg"
          >
            {QUICK_ACTIONS[action].display}
          </button>
        ))}
      </div>
    </div>
  );
}
