import { z } from 'zod/mini';
import { MAX_CODE_CHARS } from './editor';

/** Marker on window.postMessage payloads from the MAIN-world watcher. */
export const LIVE_MARKER = '__synoraLive';
export const MAX_SELECTION_CHARS = 5_000;

export interface LiveSnapshot {
  code: string;
  languageId: string;
  /** 1-based line of the cursor. */
  cursorLine: number;
  /** Currently selected text, empty when nothing is selected. */
  selection: string;
  truncated: boolean;
}

export const liveSnapshotSchema = z.object({
  code: z.string().check(z.maxLength(MAX_CODE_CHARS)),
  languageId: z.string().check(z.maxLength(40)),
  cursorLine: z.number().check(z.int(), z.minimum(1)),
  selection: z.string().check(z.maxLength(MAX_SELECTION_CHARS)),
  truncated: z.boolean(),
});

/** Message the content script relays to the side panel. */
export interface LiveCodeMessage {
  type: 'synora:live-code';
  slug: string;
  snapshot: LiveSnapshot;
}

/**
 * Runs in the page's MAIN world (chrome.scripting.executeScript). Self-contained.
 *
 * Subscribes to Monaco's change events (content, cursor/selection, model swap,
 * language switch) and posts a debounced snapshot to the window, where the
 * content script picks it up. No polling, no DOM mutation. Idempotent: a
 * second call re-emits instead of double-subscribing.
 */
export function installMonacoWatcher(
  marker: string,
  maxChars: number,
  maxSelection: number,
): 'installed' | 'already-installed' | 'no-editor' {
  interface Disposable {
    dispose(): void;
  }
  interface Range {
    startLineNumber: number;
  }
  interface Model {
    getValue(): string;
    getValueInRange(range: unknown): string;
    getLanguageId?(): string;
    isDisposed?(): boolean;
  }
  interface Editor {
    getModel(): Model | null;
    hasTextFocus?(): boolean;
    getPosition?(): { lineNumber: number } | null;
    getSelection?(): (Range & { isEmpty?(): boolean }) | null;
    onDidChangeModelContent(cb: () => void): Disposable;
    onDidChangeCursorSelection(cb: () => void): Disposable;
    onDidChangeModel(cb: () => void): Disposable;
    onDidChangeModelLanguage?(cb: () => void): Disposable;
  }
  interface Watcher {
    emit(): void;
    dispose(): void;
  }
  type Win = Window & {
    monaco?: {
      editor?: { getEditors?(): Editor[]; onDidCreateEditor?(cb: (e: Editor) => void): Disposable };
    };
    __synoraWatcher?: Watcher;
  };

  const win = window as Win;
  if (win.__synoraWatcher) {
    win.__synoraWatcher.emit();
    return 'already-installed';
  }
  const api = win.monaco?.editor;
  if (!api?.getEditors) return 'no-editor';

  const languageOf = (m: Model) => m.getLanguageId?.() ?? 'plaintext';
  const isCode = (m: Model | null): m is Model =>
    !!m && !m.isDisposed?.() && languageOf(m) !== 'plaintext';

  // The code editor is the focused one, else the largest non-plaintext model
  // (the test-case input editor is plaintext).
  let lastEditor: Editor | null = null;
  const pickEditor = (): Editor | null => {
    const editors = (api.getEditors?.() ?? []).filter((e) => isCode(e.getModel()));
    const focused = editors.find((e) => e.hasTextFocus?.());
    if (focused) {
      lastEditor = focused;
    } else if (!lastEditor || !editors.includes(lastEditor)) {
      const size = (e: Editor) => e.getModel()?.getValue().length ?? 0;
      lastEditor = editors.sort((a, b) => size(b) - size(a))[0] ?? null;
    }
    return lastEditor;
  };

  let lastPayload = '';
  const emit = () => {
    const editor = pickEditor();
    const model = editor?.getModel();
    if (!editor || !isCode(model ?? null) || !model) return;
    const value = model.getValue();
    const selectionRange = editor.getSelection?.();
    const selection =
      selectionRange && !selectionRange.isEmpty?.()
        ? model.getValueInRange(selectionRange).slice(0, maxSelection)
        : '';
    const snapshot = {
      code: value.slice(0, maxChars),
      languageId: languageOf(model),
      cursorLine: editor.getPosition?.()?.lineNumber ?? 1,
      selection,
      truncated: value.length > maxChars,
    };
    const payload = JSON.stringify(snapshot);
    if (payload === lastPayload) return;
    lastPayload = payload;
    window.postMessage({ [marker]: true, snapshot }, location.origin);
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(emit, 300);
  };

  const disposables: Disposable[] = [];
  const watched = new Set<Editor>();
  const watch = (editor: Editor) => {
    if (watched.has(editor)) return;
    watched.add(editor);
    disposables.push(
      editor.onDidChangeModelContent(schedule),
      editor.onDidChangeCursorSelection(schedule),
      editor.onDidChangeModel(schedule),
    );
    const languageSub = editor.onDidChangeModelLanguage?.(schedule);
    if (languageSub) disposables.push(languageSub);
  };
  for (const editor of api.getEditors()) watch(editor);
  const created = api.onDidCreateEditor?.(watch);
  if (created) disposables.push(created);

  win.__synoraWatcher = {
    emit: () => {
      lastPayload = '';
      emit();
    },
    dispose: () => {
      clearTimeout(timer);
      for (const d of disposables) d.dispose();
      delete win.__synoraWatcher;
    },
  };
  emit();
  return 'installed';
}

/** MAIN world: stop watching. Self-contained. */
export function uninstallMonacoWatcher(): void {
  (window as Window & { __synoraWatcher?: { dispose(): void } }).__synoraWatcher?.dispose();
}

/**
 * MAIN world: scroll the code editor to a line and select it, so a line Synora
 * mentions can be found instantly. Self-contained.
 */
export function revealLineInPage(line: number): boolean {
  interface Editor {
    getModel(): {
      getValue(): string;
      getLineCount(): number;
      getLineMaxColumn(l: number): number;
      getLanguageId?(): string;
    } | null;
    revealLineInCenter(line: number): void;
    setSelection(range: object): void;
    focus(): void;
  }
  const api = (window as Window & { monaco?: { editor?: { getEditors?(): Editor[] } } }).monaco
    ?.editor;
  const editor = (api?.getEditors?.() ?? [])
    .filter((e) => {
      const m = e.getModel();
      return m && (m.getLanguageId?.() ?? 'plaintext') !== 'plaintext';
    })
    .sort(
      (a, b) => (b.getModel()?.getValue().length ?? 0) - (a.getModel()?.getValue().length ?? 0),
    )[0];
  const model = editor?.getModel();
  if (!editor || !model || line < 1 || line > model.getLineCount()) return false;
  editor.revealLineInCenter(line);
  editor.setSelection({
    startLineNumber: line,
    startColumn: 1,
    endLineNumber: line,
    endColumn: model.getLineMaxColumn(line),
  });
  editor.focus();
  return true;
}
