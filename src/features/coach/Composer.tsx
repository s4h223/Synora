import { ArrowUp, Code2, Square } from 'lucide-react';
import { type KeyboardEvent, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MAX_USER_TEXT_CHARS } from '@/lib/ai/prompts/tutor';
import { languageLabel } from '@/lib/leetcode/editor';
import { cn } from '@/lib/utils';
import type { CodeContext } from '../context/code-store';
import { useCoachStore } from './coach-store';

interface ComposerProps {
  busy: boolean;
  /** Whether code will be attached to the next message. */
  attached: boolean;
  code: CodeContext | undefined;
  onSend(text: string): void;
  onStop(): void;
}

export function Composer({ busy, attached, code, onSend, onStop }: ComposerProps) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const attachCode = useCoachStore((s) => s.attachCode);

  const submit = () => {
    const value = text.trim();
    if (!value || busy) return;
    onSend(value);
    setText('');
    ref.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape' && busy) {
      onStop();
    }
  };

  return (
    <div className="px-3 pb-3">
      <div className="flex flex-col rounded-xl border bg-bg transition-colors focus-within:border-accent/50">
        <label htmlFor="synora-composer" className="sr-only">
          Ask Synora
        </label>
        <textarea
          id="synora-composer"
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_USER_TEXT_CHARS))}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="Ask anything about this problem or your code…"
          className="field-sizing-content max-h-40 min-h-[44px] resize-none bg-transparent px-3 pt-2.5 text-[13px] text-fg placeholder:text-fg-muted focus-visible:outline-none"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          {code ? (
            <button
              type="button"
              onClick={() => useCoachStore.getState().set({ attachCode: !attachCode })}
              aria-pressed={attached}
              className={cn(
                'inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] transition-colors',
                attached
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'text-fg-muted hover:text-fg-secondary',
              )}
              title={
                attached ? 'Your code will be sent with your message' : 'Code will not be sent'
              }
            >
              <Code2 className="size-3.5" aria-hidden />
              {attached
                ? `${code.source === 'live' ? 'Live' : languageLabel(code.languageId)} code attached`
                : 'Code not attached'}
            </button>
          ) : (
            <span className="text-[11px] text-fg-muted">No code shared</span>
          )}
          {busy ? (
            <Button size="icon-sm" variant="secondary" onClick={onStop} aria-label="Stop">
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button
              size="icon-sm"
              variant="primary"
              onClick={submit}
              disabled={!text.trim()}
              aria-label="Send"
            >
              <ArrowUp />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
