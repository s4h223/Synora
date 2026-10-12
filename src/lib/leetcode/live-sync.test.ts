import {
  installMonacoWatcher,
  LIVE_MARKER,
  revealLineInPage,
  uninstallMonacoWatcher,
} from './live-sync';

type Listener = () => void;

function fakeEditor(initial: string, languageId = 'python') {
  let value = initial;
  let focused = false;
  const listeners: Record<string, Listener[]> = { content: [], cursor: [], model: [] };
  let mouse: ((e: unknown) => void) | null = null;
  const on = (key: string) => (cb: Listener) => {
    listeners[key]!.push(cb);
    return { dispose: () => (listeners[key] = listeners[key]!.filter((l) => l !== cb)) };
  };
  const model = {
    getValue: () => value,
    getValueInRange: () => 'sel',
    getLanguageId: () => languageId,
    getLineCount: () => value.split('\n').length,
    getLineMaxColumn: () => 10,
    getLineContent: (n: number) => value.split('\n')[n - 1] ?? '',
    getWordAtPosition: () => ({ word: 'enumerate' }),
  };
  const editor = {
    getModel: () => model,
    hasTextFocus: () => focused,
    getPosition: () => ({ lineNumber: 2 }),
    getSelection: () => ({ startLineNumber: 1, isEmpty: () => true }),
    onDidChangeModelContent: on('content'),
    onDidChangeCursorSelection: on('cursor'),
    onDidChangeModel: on('model'),
    onMouseMove: (cb: (e: unknown) => void) => {
      mouse = cb;
      return { dispose: () => (mouse = null) };
    },
    revealLineInCenter: vi.fn(),
    setSelection: vi.fn(),
    focus: vi.fn(),
  };
  return {
    editor,
    type(next: string) {
      value = next;
      for (const l of listeners.content!) l();
    },
    focus() {
      focused = true;
    },
    hover(lineNumber: number) {
      mouse?.({ target: { position: { lineNumber, column: 5 } } });
    },
    listenerCount: () => Object.values(listeners).reduce((n, l) => n + l.length, 0),
  };
}

function install(...editors: ReturnType<typeof fakeEditor>[]) {
  (window as unknown as { monaco: unknown }).monaco = {
    editor: {
      getEditors: () => editors.map((e) => e.editor),
      onDidCreateEditor: () => ({ dispose() {} }),
    },
  };
}

let posted: unknown[];

beforeEach(() => {
  vi.useFakeTimers();
  posted = [];
  vi.spyOn(window, 'postMessage').mockImplementation((message: unknown) => {
    posted.push(message);
  });
});

afterEach(() => {
  uninstallMonacoWatcher();
  delete (window as unknown as { monaco?: unknown }).monaco;
  vi.useRealTimers();
});

describe('installMonacoWatcher', () => {
  it('reports when Monaco is missing', () => {
    expect(installMonacoWatcher(LIVE_MARKER, 1000, 100)).toBe('no-editor');
  });

  it('posts an initial snapshot, then debounced snapshots on edits', () => {
    const code = fakeEditor('def f():\n    pass');
    install(fakeEditor('[1,2]\n3', 'plaintext'), code);

    expect(installMonacoWatcher(LIVE_MARKER, 1000, 100)).toBe('installed');
    expect(posted).toEqual([
      {
        [LIVE_MARKER]: true,
        snapshot: {
          code: 'def f():\n    pass',
          languageId: 'python',
          cursorLine: 2,
          selection: '',
          truncated: false,
        },
      },
    ]);

    code.type('def f():\n    return 1');
    code.type('def f():\n    return 12');
    expect(posted).toHaveLength(1);
    vi.advanceTimersByTime(300);
    expect(posted).toHaveLength(2);
    expect((posted[1] as { snapshot: { code: string } }).snapshot.code).toBe(
      'def f():\n    return 12',
    );
  });

  it('does not double-subscribe and cleans up on uninstall', () => {
    const code = fakeEditor('x = 1');
    install(code);
    installMonacoWatcher(LIVE_MARKER, 1000, 100);
    const subscribed = code.listenerCount();
    expect(installMonacoWatcher(LIVE_MARKER, 1000, 100)).toBe('already-installed');
    expect(code.listenerCount()).toBe(subscribed);

    uninstallMonacoWatcher();
    expect(code.listenerCount()).toBe(0);
  });

  it('truncates very long code', () => {
    install(fakeEditor('a'.repeat(50)));
    installMonacoWatcher(LIVE_MARKER, 10, 100);
    expect(posted[0]).toMatchObject({ snapshot: { code: 'a'.repeat(10), truncated: true } });
  });
});

describe('hover reporting', () => {
  it('reports the hovered line after the pointer rests', () => {
    const code = fakeEditor('a = 1\nfor i, n in enumerate(nums):');
    install(code);
    installMonacoWatcher(LIVE_MARKER, 1000, 100, 450, 500);
    posted = [];

    code.hover(1);
    vi.advanceTimersByTime(200);
    code.hover(2); // moved before the dwell elapsed
    vi.advanceTimersByTime(449);
    expect(posted).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(posted).toEqual([
      {
        [LIVE_MARKER]: true,
        hover: { line: 2, lineText: 'for i, n in enumerate(nums):', word: 'enumerate' },
      },
    ]);

    // Resting on the same line/word again doesn't re-post.
    code.hover(2);
    vi.advanceTimersByTime(500);
    expect(posted).toHaveLength(1);
  });
});

describe('revealLineInPage', () => {
  it('scrolls to and selects a valid line in the code editor', () => {
    const code = fakeEditor('a\nb\nc');
    install(code);
    expect(revealLineInPage(2)).toBe(true);
    expect(code.editor.revealLineInCenter).toHaveBeenCalledWith(2);
    expect(code.editor.setSelection).toHaveBeenCalledWith({
      startLineNumber: 2,
      startColumn: 1,
      endLineNumber: 2,
      endColumn: 10,
    });
  });

  it('rejects out-of-range lines', () => {
    install(fakeEditor('a'));
    expect(revealLineInPage(5)).toBe(false);
  });
});
