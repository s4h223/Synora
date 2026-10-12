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
  };
  const editor = {
    getModel: () => model,
    hasTextFocus: () => focused,
    getPosition: () => ({ lineNumber: 2 }),
    getSelection: () => ({ startLineNumber: 1, isEmpty: () => true }),
    onDidChangeModelContent: on('content'),
    onDidChangeCursorSelection: on('cursor'),
    onDidChangeModel: on('model'),
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
