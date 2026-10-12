import { ArrowRight, Code2, Eye, EyeOff, GraduationCap, KeyRound } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { LogoMark } from '@/components/brand/logo-mark';
import { Button } from '@/components/ui/button';
import type { CodeAccess, ExperienceLevel } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { useSettings } from '../settings/use-settings';
import { useUiStore } from '../shell/ui-store';

const LEVELS: { value: ExperienceLevel; title: string; body: string }[] = [
  {
    value: 'beginner',
    title: 'I’m new to this',
    body: 'Explain everything: syntax, terms, and each step.',
  },
  {
    value: 'intermediate',
    title: 'I know the basics',
    body: 'Help me find patterns and think through problems.',
  },
  { value: 'advanced', title: 'I’m experienced', body: 'Keep it short and technical.' },
];

const ACCESS: { value: CodeAccess; title: string; body: string; icon: typeof Eye }[] = [
  {
    value: 'live',
    title: 'Follow along as I type (recommended)',
    body: 'Synora always sees your latest code, like a pair programmer. It’s sent to your AI only when you ask something.',
    icon: Eye,
  },
  {
    value: 'ask',
    title: 'Only when I click “Read from editor”',
    body: 'You decide each time.',
    icon: Code2,
  },
  {
    value: 'off',
    title: 'Never read my editor',
    body: 'You can still paste code manually.',
    icon: EyeOff,
  },
];

/** First-run setup: three quick choices, all changeable later in Settings. */
export function WelcomeView() {
  const { settings, update } = useSettings();
  const openSettings = useUiStore((s) => s.openSettings);
  const [step, setStep] = useState(0);

  const finish = async (setUpAi: boolean) => {
    await update({ onboardingComplete: true });
    if (setUpAi) openSettings('ai');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 animate-fade-in">
      <div className="mb-5 flex items-center gap-2">
        <LogoMark className="size-5" />
        <span className="font-semibold text-fg text-sm tracking-tight">Welcome to Synora</span>
        <span className="ml-auto text-[11px] text-fg-muted">{step + 1} / 3</span>
      </div>

      {step === 0 && (
        <Step
          icon={<GraduationCap className="size-5" />}
          title="How much coding experience do you have?"
          body="Synora adjusts how it explains things. You can change this anytime."
        >
          {LEVELS.map((level) => (
            <Choice
              key={level.value}
              selected={settings.experienceLevel === level.value}
              title={level.title}
              body={level.body}
              onSelect={() => void update({ experienceLevel: level.value })}
            />
          ))}
          <Next onClick={() => setStep(1)} />
        </Step>
      )}

      {step === 1 && (
        <Step
          icon={<Code2 className="size-5" />}
          title="How should Synora see your code?"
          body="Reading your code happens in your browser. Nothing leaves it until you ask the AI a question."
        >
          {ACCESS.map((option) => (
            <Choice
              key={option.value}
              selected={settings.codeAccess === option.value}
              title={option.title}
              body={option.body}
              icon={<option.icon className="size-4" />}
              onSelect={() =>
                void update(
                  option.value === 'live'
                    ? { codeAccess: 'live' }
                    : { codeAccess: option.value, pairMode: 'off' },
                )
              }
            />
          ))}
          <Next onClick={() => setStep(2)} />
        </Step>
      )}

      {step === 2 && (
        <Step
          icon={<KeyRound className="size-5" />}
          title="Connect an AI"
          body="Synora is free and open source, but AI models cost money to run. Pick what works for you:"
        >
          <ul className="flex flex-col gap-2 text-fg-secondary text-xs leading-relaxed">
            <li>
              <span className="text-fg">Free:</span> run a model on your computer with Ollama, or
              use a free-tier key (Gemini, Groq, OpenRouter).
            </li>
            <li>
              <span className="text-fg">Paid:</span> your own Anthropic or OpenAI key, billed by
              them.
            </li>
            <li>Your key stays in this browser. Synora has no servers.</li>
          </ul>
          <div className="mt-2 flex flex-col gap-2">
            <Button variant="primary" onClick={() => void finish(true)}>
              Set up AI now <ArrowRight />
            </Button>
            <Button variant="ghost" onClick={() => void finish(false)}>
              Later
            </Button>
          </div>
        </Step>
      )}
    </div>
  );
}

function Step({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 animate-fade-in" aria-label={title}>
      <div className="flex size-9 items-center justify-center rounded-xl border bg-surface text-accent">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-base text-fg tracking-tight">{title}</h2>
        <p className="text-fg-secondary text-xs leading-relaxed">{body}</p>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Choice({
  selected,
  title,
  body,
  icon,
  onSelect,
}: {
  selected: boolean;
  title: string;
  body: string;
  icon?: ReactNode;
  onSelect(): void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
        selected ? 'border-accent/60 bg-accent/10' : 'bg-surface hover:border-fg-muted/60',
      )}
    >
      {icon && (
        <span className={cn('mt-0.5', selected ? 'text-accent' : 'text-fg-muted')}>{icon}</span>
      )}
      <span className="flex flex-col gap-0.5">
        <span className="font-medium text-[13px] text-fg">{title}</span>
        <span className="text-fg-secondary text-xs">{body}</span>
      </span>
    </button>
  );
}

function Next({ onClick }: { onClick(): void }) {
  return (
    <Button variant="primary" className="mt-2" onClick={onClick}>
      Continue <ArrowRight />
    </Button>
  );
}
