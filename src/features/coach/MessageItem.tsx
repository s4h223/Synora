import { AlertTriangle, Code2, Lightbulb, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QUICK_ACTIONS, type QuickAction } from '@/lib/ai/prompts/tutor';
import type { MessageRecord } from '@/lib/db/schema';
import { languageLabel } from '@/lib/leetcode/editor';
import { Markdown } from './Markdown';

interface MessageItemProps {
  message: MessageRecord;
  /** Live text while this message is streaming, otherwise null. */
  streamingText: string | null;
  onRetry(): void;
  canRetry: boolean;
}

export function MessageItem({ message, streamingText, onRetry, canRetry }: MessageItemProps) {
  if (message.role === 'user') return <UserMessage message={message} />;
  if (message.kind === 'nudge') return <Nudge message={message} />;

  const text = streamingText ?? message.content;
  const streaming = streamingText !== null || message.status === 'streaming';

  return (
    <div className="flex flex-col gap-1.5 animate-fade-in">
      {text ? <Markdown text={text} /> : streaming ? <TypingIndicator /> : null}
      {streaming && text && <span className="sr-only">Synora is typing</span>}

      {message.status === 'stopped' && <p className="text-fg-muted text-xs">Stopped.</p>}
      {message.status === 'refused' && (
        <Notice icon={<ShieldAlert className="size-3.5" />}>
          The model declined to answer this. Try rephrasing your question.
        </Notice>
      )}
      {message.status === 'error' && (
        <div className="flex flex-col gap-2 rounded-lg border border-error/30 bg-error/5 p-2.5">
          <p className="flex items-start gap-1.5 text-error text-xs">
            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
            {message.error ?? 'Something went wrong.'}
          </p>
          <Button size="sm" className="w-fit" disabled={!canRetry} onClick={onRetry}>
            <RotateCcw /> Retry
          </Button>
        </div>
      )}
    </div>
  );
}

function UserMessage({ message }: { message: MessageRecord }) {
  const action = message.action as QuickAction | undefined;
  return (
    <div className="flex flex-col items-end gap-1 animate-fade-in">
      <div className="max-w-[90%] whitespace-pre-wrap rounded-xl rounded-br-sm bg-elevated px-3 py-2 text-[13px] text-fg">
        {message.content}
      </div>
      <div className="flex flex-wrap justify-end gap-1">
        {message.kind === 'hint' && message.hintLevel && (
          <Badge tone="accent">
            <Lightbulb className="size-3" aria-hidden />
            {message.hintLevel === 4 ? 'Solution' : `Hint ${message.hintLevel}/4`}
          </Badge>
        )}
        {action && QUICK_ACTIONS[action] && <Badge>{QUICK_ACTIONS[action].label}</Badge>}
        {message.code && (
          <Badge>
            <Code2 className="size-3" aria-hidden />
            {languageLabel(message.code.languageId)} · {message.code.lines} lines
          </Badge>
        )}
      </div>
    </div>
  );
}

function Nudge({ message }: { message: MessageRecord }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-accent/25 border-l-2 border-l-accent bg-accent/5 px-3 py-2 animate-fade-in">
      <span className="flex items-center gap-1 font-medium text-[11px] text-accent">
        <Sparkles className="size-3" aria-hidden /> Synora noticed
      </span>
      <Markdown
        text={message.line ? `${message.content} (line ${message.line})` : message.content}
      />
    </div>
  );
}

function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-warning text-xs">
      <span className="mt-px shrink-0">{icon}</span>
      {children}
    </p>
  );
}

function TypingIndicator() {
  return (
    <div className="flex h-5 items-center gap-1" role="status">
      <span className="sr-only">Synora is thinking</span>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-pulse rounded-full bg-fg-muted"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
