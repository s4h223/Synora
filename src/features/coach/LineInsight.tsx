import {
  AlertTriangle,
  ChevronDown,
  MousePointer2,
  Pin,
  PinOff,
  Send,
  TextCursor,
} from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LINE_ACTION_LABELS, type LineAction, lineActionPrompt } from '@/lib/ai/prompts/tutor';
import { lookupLine } from '@/lib/learning/glossary';
import { findPitfalls } from '@/lib/learning/pitfalls';
import { revealLine } from '@/lib/leetcode/browser-bridge';
import type { ExperienceLevel } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { type LineFocus, useCodeStore } from '../context/code-store';
import { useProblemStore } from '../context/problem-store';
import type { SendOptions } from './use-coach';

interface LineInsightProps {
  focus: LineFocus;
  languageId: string;
  level: ExperienceLevel;
  busy: boolean;
  onAsk(options: SendOptions): void;
}

const ACTIONS_BY_LEVEL: Record<ExperienceLevel, LineAction[]> = {
  beginner: ['line-basics', 'line-purpose', 'line-trace'],
  intermediate: ['line-purpose', 'line-trace', 'line-risk'],
  advanced: ['line-purpose', 'line-risk'],
};

/**
 * The line you're hovering (or where your cursor is), with instant local
 * reference, possible pitfalls, and line-scoped questions for the tutor.
 */
export function LineInsight({ focus, languageId, level, busy, onAsk }: LineInsightProps) {
  const pinned = useCodeStore((s) => s.focusPinned);
  const setPinned = useCodeStore((s) => s.setFocusPinned);
  const tabId = useProblemStore((s) => (s.state.status === 'ready' ? s.state.tabId : null));
  const [collapsed, setCollapsed] = useState(false);
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState('');
  const explainId = useId();

  const entries = useMemo(
    () => lookupLine(focus.lineText, languageId, focus.word),
    [focus.lineText, languageId, focus.word],
  );
  const pitfalls = useMemo(
    () => findPitfalls(focus.lineText, languageId),
    [focus.lineText, languageId],
  );
  const shown = entries.find((e) => e.id === openEntry) ?? entries[0];

  const ask = (action: LineAction, studentExplanation?: string) => {
    const { display, instruction } = lineActionPrompt(
      action,
      focus.line,
      focus.lineText,
      studentExplanation,
    );
    onAsk({ display, instruction, kind: 'action', action });
  };

  const submitExplanation = () => {
    if (!explanation.trim()) return;
    ask('line-explain-back', explanation.trim());
    setExplanation('');
    setExplaining(false);
  };

  return (
    <section
      aria-label={`Line ${focus.line} insight`}
      className="mx-3 mt-2 flex flex-col gap-2 rounded-lg border bg-bg/80 p-2.5 animate-fade-in"
    >
      <header className="flex items-center gap-2">
        {focus.source === 'hover' ? (
          <MousePointer2 className="size-3.5 shrink-0 text-fg-muted" aria-label="Hovered line" />
        ) : (
          <TextCursor className="size-3.5 shrink-0 text-fg-muted" aria-label="Cursor line" />
        )}
        <button
          type="button"
          onClick={() => tabId !== null && void revealLine(tabId, focus.line)}
          className="font-medium text-[11px] text-accent hover:underline"
          title="Show in editor"
        >
          Line {focus.line}
        </button>
        <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-secondary">
          {focus.lineText.trim()}
        </code>
        <button
          type="button"
          onClick={() => setPinned(!pinned)}
          aria-pressed={pinned}
          title={pinned ? 'Unpin: follow the mouse again' : 'Pin this line'}
          className={cn('text-fg-muted hover:text-fg', pinned && 'text-accent')}
        >
          {pinned ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand line insight' : 'Collapse line insight'}
          className="text-fg-muted hover:text-fg"
        >
          <ChevronDown className={cn('size-3.5 transition-transform', collapsed && '-rotate-90')} />
        </button>
      </header>

      {!collapsed && (
        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
          {pitfalls.map((p) => (
            <div
              key={p.id}
              className="flex gap-1.5 rounded-md border border-warning/30 bg-warning/5 p-2"
            >
              <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning" aria-hidden />
              <p className="text-xs leading-relaxed">
                <span className="font-medium text-warning">Possible pitfall: {p.title}. </span>
                <span className="text-fg-secondary">{p.explanation}</span>
              </p>
            </div>
          ))}

          {shown && (
            <div className="flex flex-col gap-1.5">
              {entries.length > 1 && (
                <div className="flex flex-wrap gap-1" role="tablist" aria-label="Reference">
                  {entries.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      role="tab"
                      aria-selected={e.id === shown.id}
                      onClick={() => setOpenEntry(e.id)}
                      className={cn(
                        'h-5 rounded px-1.5 font-mono text-[11px] transition-colors',
                        e.id === shown.id
                          ? 'bg-accent/15 text-accent'
                          : 'text-fg-muted hover:text-fg-secondary',
                      )}
                    >
                      {e.title}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-1 text-xs leading-relaxed" role="tabpanel">
                {entries.length === 1 && (
                  <span className="font-medium font-mono text-[11px] text-accent">
                    {shown.title}
                  </span>
                )}
                <p className="text-fg-secondary">{shown.summary}</p>
                {shown.example && (
                  <pre className="overflow-x-auto rounded bg-elevated px-2 py-1.5 font-mono text-[11px] text-fg">
                    {shown.example}
                  </pre>
                )}
                {shown.cost && (
                  <p className="text-fg-secondary">
                    <span className="text-fg-muted">Cost: </span>
                    {shown.cost}
                  </p>
                )}
                {shown.pitfall && (
                  <p className="text-fg-secondary">
                    <span className="text-warning">Watch out: </span>
                    {shown.pitfall}
                  </p>
                )}
              </div>
            </div>
          )}

          {explaining ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={explainId} className="text-[11px] text-fg-secondary">
                In your own words, what does line {focus.line} do and why is it there?
              </label>
              <div className="flex items-end gap-1.5">
                <textarea
                  id={explainId}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value.slice(0, 1000))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitExplanation();
                    }
                  }}
                  rows={2}
                  className="field-sizing-content max-h-24 min-h-9 flex-1 resize-none rounded-md border bg-surface px-2 py-1.5 text-xs text-fg focus-visible:border-accent/60"
                />
                <Button
                  size="icon-sm"
                  variant="primary"
                  aria-label="Check my explanation"
                  disabled={busy || !explanation.trim()}
                  onClick={submitExplanation}
                >
                  <Send />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {ACTIONS_BY_LEVEL[level].map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={busy}
                  onClick={() => ask(action)}
                  className="h-6 rounded-full border bg-surface px-2.5 text-[11px] text-fg-secondary transition-colors hover:border-fg-muted/60 hover:text-fg disabled:opacity-50"
                >
                  {LINE_ACTION_LABELS[action]}
                </button>
              ))}
              {level !== 'advanced' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setExplaining(true)}
                  className="h-6 rounded-full border border-accent/40 bg-accent/10 px-2.5 text-[11px] text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                >
                  Explain it back
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
