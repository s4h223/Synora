import { Code2 } from 'lucide-react';
import { useState } from 'react';
import { languageLabel } from '@/lib/leetcode/editor';
import { cn } from '@/lib/utils';
import { CodeSheet } from './CodeSheet';
import { useCodeStore } from './code-store';

export function CodeChip({ slug, tabId }: { slug: string; tabId: number }) {
  const [open, setOpen] = useState(false);
  const code = useCodeStore((s) => s.bySlug[slug]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 font-medium text-[11px] transition-colors',
          code
            ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/15'
            : 'bg-elevated text-fg-secondary hover:text-fg',
        )}
        aria-label={code ? `Code attached: ${languageLabel(code.languageId)}` : 'Add code'}
      >
        <Code2 className="size-3.5" aria-hidden />
        {code ? languageLabel(code.languageId) : 'Add code'}
      </button>
      <CodeSheet open={open} onOpenChange={setOpen} slug={slug} tabId={tabId} />
    </>
  );
}
