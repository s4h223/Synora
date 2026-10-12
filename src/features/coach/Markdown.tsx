import hljs from 'highlight.js/lib/core';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import typescript from 'highlight.js/lib/languages/typescript';
import { Check, Copy } from 'lucide-react';
import { isValidElement, memo, type ReactNode, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { revealLine } from '@/lib/leetcode/browser-bridge';
import { useProblemStore } from '../context/problem-store';
import { lineFromHref, linkifyLineRefs } from './markdown-utils';

for (const [name, lang] of Object.entries({
  c,
  cpp,
  csharp,
  go,
  java,
  javascript,
  python,
  rust,
  typescript,
})) {
  hljs.registerLanguage(name, lang);
}
hljs.registerAliases(['py', 'python3'], { languageName: 'python' });
hljs.registerAliases(['c++'], { languageName: 'cpp' });
hljs.registerAliases(['js'], { languageName: 'javascript' });
hljs.registerAliases(['ts'], { languageName: 'typescript' });
hljs.registerAliases(['golang'], { languageName: 'go' });
hljs.registerAliases(['cs', 'c#'], { languageName: 'csharp' });

const components: Components = {
  a: ({ href, children }) => {
    const line = lineFromHref(href);
    if (line !== null) return <LineLink line={line}>{children}</LineLink>;
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className="text-accent underline">
        {children}
      </a>
    );
  },
  pre: ({ children }) => {
    const child = Array.isArray(children) ? children[0] : children;
    if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) {
      return <pre>{children}</pre>;
    }
    const language = /language-([\w+#-]+)/.exec(child.props.className ?? '')?.[1] ?? '';
    return (
      <CodeBlock language={language} code={String(child.props.children ?? '').replace(/\n$/, '')} />
    );
  },
  code: ({ children }) => (
    <code className="rounded bg-elevated px-1 py-px font-mono text-[12px] text-fg">{children}</code>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
};

/** Renders model output as Markdown. Raw HTML is never rendered. */
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="synora-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {linkifyLineRefs(text)}
      </ReactMarkdown>
    </div>
  );
});

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const known = language && hljs.getLanguage(language);
  const html = known
    ? hljs.highlight(code, { language, ignoreIllegals: true }).value
    : hljs.highlightAuto(code, ['python', 'java', 'cpp', 'javascript']).value;

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-2 overflow-hidden rounded-lg border bg-bg">
      <div className="flex h-7 items-center justify-between border-b px-2.5">
        <span className="font-mono text-[11px] text-fg-muted">{language || 'code'}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed">
        {/* highlight.js escapes the source, so its HTML output is safe to inject. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: escaped highlighter output */}
        <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

function LineLink({ line, children }: { line: number; children: ReactNode }) {
  const tabId = useProblemStore((s) => (s.state.status === 'ready' ? s.state.tabId : null));
  return (
    <button
      type="button"
      disabled={tabId === null}
      onClick={() => tabId !== null && void revealLine(tabId, line)}
      className="rounded-sm text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
      title="Show this line in the editor"
    >
      {children}
    </button>
  );
}
