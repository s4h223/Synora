import { ClipboardPaste, FileCode2, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { recordEvent } from '@/lib/db/repository';
import { db } from '@/lib/db/schema';
import { readEditorCode } from '@/lib/leetcode/browser-bridge';
import { languageLabel, MAX_CODE_CHARS, PASTE_LANGUAGES } from '@/lib/leetcode/editor';
import { useSettings } from '../settings/use-settings';
import { type CodeContext, useCodeStore } from './code-store';

interface CodeSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  slug: string;
  tabId: number;
}

const READ_ERRORS = {
  'no-editor': "Couldn't find LeetCode's code editor on this page. Paste your code below instead.",
  empty: 'The editor is empty.',
  'injection-failed': "Couldn't read the editor. Try reloading the page, or paste your code below.",
} as const;

export function CodeSheet({ open, onOpenChange, slug, tabId }: CodeSheetProps) {
  const { settings } = useSettings();
  const code = useCodeStore((s) => s.bySlug[slug]);
  const setCode = useCodeStore((s) => s.setCode);
  const clearCode = useCodeStore((s) => s.clearCode);

  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [pasteLanguage, setPasteLanguage] = useState('python');
  const pasteId = useId();
  const languageId = useId();

  const capture = (context: CodeContext) => {
    setCode(slug, context);
    if (settings.sessionTracking) {
      void recordEvent(db, 'code_captured', slug, {
        source: context.source,
        languageId: context.languageId,
        lines: context.code.split('\n').length,
      }).catch((error: unknown) => console.error('Synora: failed to record event', error));
    }
  };

  const readFromEditor = async () => {
    setReading(true);
    setReadError(null);
    const result = await readEditorCode(tabId);
    setReading(false);
    if (!result.ok) {
      setReadError(READ_ERRORS[result.reason]);
      return;
    }
    capture({
      code: result.code,
      languageId: result.languageId,
      source: 'editor',
      capturedAt: Date.now(),
      truncated: result.truncated,
    });
  };

  const applyPasted = () => {
    if (!pasted.trim()) return;
    capture({
      code: pasted.slice(0, MAX_CODE_CHARS),
      languageId: pasteLanguage,
      source: 'paste',
      capturedAt: Date.now(),
      truncated: pasted.length > MAX_CODE_CHARS,
    });
    setPasted('');
  };

  const editorAllowed = settings.codeAccess !== 'off';

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Your code"
      description="Give Synora your current solution so it can help with your actual code."
    >
      <div className="flex flex-col gap-5">
        {code && (
          <section className="flex flex-col gap-2" aria-label="Captured code">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Badge tone="accent">{languageLabel(code.languageId)}</Badge>
                <Badge>{code.source === 'editor' ? 'From editor' : 'Pasted'}</Badge>
                <span className="text-fg-muted text-xs">{code.code.split('\n').length} lines</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => clearCode(slug)}>
                <Trash2 /> Clear
              </Button>
            </div>
            {code.truncated && (
              <p className="text-warning text-xs">
                Code was longer than {MAX_CODE_CHARS.toLocaleString()} characters and was truncated.
              </p>
            )}
            <pre className="max-h-56 overflow-auto rounded-lg border bg-bg p-3 font-mono text-[12px] text-fg leading-relaxed">
              <code>{code.code}</code>
            </pre>
          </section>
        )}

        <section className="flex flex-col gap-2" aria-label="Read from editor">
          <Button
            variant={code ? 'secondary' : 'primary'}
            onClick={() => void readFromEditor()}
            disabled={!editorAllowed || reading}
          >
            <FileCode2 />
            {reading
              ? 'Reading…'
              : code?.source === 'editor'
                ? 'Re-read editor'
                : 'Read from editor'}
          </Button>
          {!editorAllowed && (
            <p className="text-fg-secondary text-xs">
              Editor access is turned off. You can change this in Settings → Privacy, or paste your
              code below.
            </p>
          )}
          {readError && (
            <p className="text-error text-xs" role="alert">
              {readError}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2" aria-label="Paste code">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={pasteId} className="font-medium text-fg-secondary text-xs">
              Or paste code
            </label>
            <label htmlFor={languageId} className="sr-only">
              Language
            </label>
            <select
              id={languageId}
              value={pasteLanguage}
              onChange={(e) => setPasteLanguage(e.target.value)}
              className="h-7 rounded-md border bg-elevated px-2 text-fg text-xs"
            >
              {PASTE_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {languageLabel(lang)}
                </option>
              ))}
            </select>
          </div>
          <textarea
            id={pasteId}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            spellCheck={false}
            rows={6}
            placeholder="class Solution: ..."
            className="resize-y rounded-lg border bg-bg p-3 font-mono text-[12px] text-fg placeholder:text-fg-muted focus-visible:border-accent/60"
          />
          <Button onClick={applyPasted} disabled={!pasted.trim()}>
            <ClipboardPaste /> Use pasted code
          </Button>
        </section>

        <p className="text-fg-muted text-xs leading-relaxed">
          Code stays in this panel's memory until you close it. Nothing is sent anywhere unless you
          ask an AI feature for help.
        </p>
      </div>
    </Sheet>
  );
}
