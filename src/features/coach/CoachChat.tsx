import { Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { QUICK_ACTIONS, type QuickAction } from '@/lib/ai/prompts/tutor';
import type { Problem } from '@/lib/leetcode/types';
import { useSettings } from '../settings/use-settings';
import { Composer } from './Composer';
import { useCoachStore } from './coach-store';
import { HintLadder } from './HintLadder';
import { MessageItem } from './MessageItem';
import { PairStatusBadge } from './PairStatusBadge';
import { QuickActions } from './QuickActions';
import { useCoach } from './use-coach';
import { WelcomeSuggestions } from './WelcomeSuggestions';

export function CoachChat({ problem }: { problem: Problem }) {
  const coach = useCoach(problem);
  const { settings } = useSettings();
  const streamingText = useCoachStore((s) => s.streamingText);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Follow new content only if the user hasn't scrolled up to read.
  const lastMessage = coach.messages.at(-1);
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when content grows
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [coach.messages.length, lastMessage?.id, streamingText]);

  const runAction = (action: QuickAction) => {
    const spec = QUICK_ACTIONS[action];
    void coach.send({
      display: spec.display,
      kind: 'action',
      action,
      instruction: spec.instruction,
      withSelection: spec.needsSelection ?? false,
    });
  };

  const busy = coach.streamingId !== null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
        <PairStatusBadge />
        <Tooltip content="New conversation">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="New conversation"
            onClick={() => void coach.newChat()}
          >
            <Plus />
          </Button>
        </Tooltip>
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
        aria-live="polite"
        aria-busy={busy}
      >
        {coach.loading ? null : coach.messages.length === 0 ? (
          <WelcomeSuggestions
            level={settings.experienceLevel}
            hasCode={!!coach.code}
            onAction={runAction}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {coach.messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                streamingText={message.id === coach.streamingId ? streamingText : null}
                onRetry={() => void coach.retry(message.id)}
                canRetry={!busy}
              />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t bg-surface/60">
        <HintLadder
          level={coach.hintLevel}
          disabled={busy}
          onHint={(level, instruction) =>
            void coach.send({
              display:
                level === 4 ? 'Show me the full solution.' : `Give me a hint (level ${level}).`,
              kind: 'hint',
              hintLevel: level,
              instruction,
            })
          }
        />
        <QuickActions
          level={settings.experienceLevel}
          hasCode={!!coach.code}
          hasSelection={!!coach.code?.selection?.trim()}
          disabled={busy}
          onAction={runAction}
        />
        <Composer
          busy={busy}
          attached={coach.attached}
          code={coach.code}
          onSend={(text) => void coach.send({ display: text, kind: 'chat' })}
          onStop={coach.stop}
        />
      </div>
    </div>
  );
}
