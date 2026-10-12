/** Upper bound on code we accept from the editor (LeetCode solutions are far smaller). */
export const MAX_CODE_CHARS = 50_000;

export type EditorReadResult =
  | { ok: true; code: string; languageId: string; truncated: boolean }
  | { ok: false; reason: 'no-editor' | 'empty' | 'injection-failed'; message?: string };

/**
 * Runs in the LeetCode page's MAIN world via chrome.scripting.executeScript.
 * It must be fully self-contained: no imports, no closures over module scope.
 *
 * LeetCode's editor is Monaco, exposed as `window.monaco`. The page can host
 * several Monaco editors (code + test case input), so we prefer the focused
 * editor, then the largest non-plaintext model.
 */
export function readMonacoInPage(maxChars: number): EditorReadResult {
  interface MonacoModel {
    getValue(): string;
    getLanguageId?(): string;
    getModeId?(): string;
    isDisposed?(): boolean;
  }
  interface MonacoEditor {
    getModel(): MonacoModel | null;
    hasTextFocus?(): boolean;
  }
  interface MonacoGlobal {
    editor?: { getEditors?(): MonacoEditor[]; getModels?(): MonacoModel[] };
  }

  const monaco = (window as unknown as { monaco?: MonacoGlobal }).monaco;
  if (!monaco?.editor) return { ok: false, reason: 'no-editor' };

  const languageOf = (m: MonacoModel) => m.getLanguageId?.() ?? m.getModeId?.() ?? 'plaintext';
  const usable = (m: MonacoModel | null | undefined): m is MonacoModel =>
    !!m && !m.isDisposed?.() && languageOf(m) !== 'plaintext';

  const editors = monaco.editor.getEditors?.() ?? [];
  const focused = editors.find((e) => e.hasTextFocus?.())?.getModel();

  let model: MonacoModel | undefined = usable(focused) ? focused : undefined;
  if (!model) {
    const fromEditors = editors.map((e) => e.getModel()).filter(usable);
    const candidates = fromEditors.length ? fromEditors : (monaco.editor.getModels?.() ?? []);
    model = candidates.filter(usable).sort((a, b) => b.getValue().length - a.getValue().length)[0];
  }
  if (!model) return { ok: false, reason: 'no-editor' };

  const value = model.getValue();
  if (!value.trim()) return { ok: false, reason: 'empty' };

  return {
    ok: true,
    code: value.slice(0, maxChars),
    languageId: languageOf(model),
    truncated: value.length > maxChars,
  };
}

const LANGUAGE_LABELS: Record<string, string> = {
  python: 'Python',
  python3: 'Python 3',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  csharp: 'C#',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  go: 'Go',
  golang: 'Go',
  rust: 'Rust',
  kotlin: 'Kotlin',
  swift: 'Swift',
  ruby: 'Ruby',
  php: 'PHP',
  scala: 'Scala',
  dart: 'Dart',
};

export function languageLabel(languageId: string): string {
  return LANGUAGE_LABELS[languageId] ?? languageId;
}

/** Languages offered for manual paste. Ordered by LeetCode popularity. */
export const PASTE_LANGUAGES = ['python', 'java', 'cpp', 'javascript', 'typescript', 'c', 'go'];
