import { readMonacoInPage } from './editor';

interface FakeModel {
  getValue(): string;
  getLanguageId(): string;
}

function model(value: string, languageId: string): FakeModel {
  return { getValue: () => value, getLanguageId: () => languageId };
}

function editor(m: FakeModel | null, focused = false) {
  return { getModel: () => m, hasTextFocus: () => focused };
}

function installMonaco(editors: ReturnType<typeof editor>[], models: FakeModel[] = []) {
  (window as unknown as { monaco: unknown }).monaco = {
    editor: { getEditors: () => editors, getModels: () => models },
  };
}

afterEach(() => {
  delete (window as unknown as { monaco?: unknown }).monaco;
});

describe('readMonacoInPage', () => {
  it('reports no editor when Monaco is absent', () => {
    expect(readMonacoInPage(1000)).toEqual({ ok: false, reason: 'no-editor' });
  });

  it('prefers the focused editor', () => {
    installMonaco([
      editor(model('class Solution:\n    pass\n# long long long', 'python')),
      editor(model('int x;', 'cpp'), true),
    ]);
    expect(readMonacoInPage(1000)).toEqual({
      ok: true,
      code: 'int x;',
      languageId: 'cpp',
      truncated: false,
    });
  });

  it('otherwise picks the largest non-plaintext model (ignoring the test case editor)', () => {
    installMonaco([
      editor(model('[2,7,11,15]\n9\n[3,2,4]\n6\n[3,3]\n6 plus lots of text', 'plaintext')),
      editor(model('class Solution:\n    def twoSum(self): ...', 'python')),
      editor(model('x', 'python')),
    ]);
    const result = readMonacoInPage(1000);
    expect(result).toMatchObject({ ok: true, languageId: 'python' });
    expect(result.ok && result.code).toContain('twoSum');
  });

  it('falls back to global models when no editors are registered', () => {
    installMonaco([], [model('fn main() {}', 'rust')]);
    expect(readMonacoInPage(1000)).toMatchObject({ ok: true, languageId: 'rust' });
  });

  it('reports an empty editor', () => {
    installMonaco([editor(model('   \n', 'python'))]);
    expect(readMonacoInPage(1000)).toEqual({ ok: false, reason: 'empty' });
  });

  it('truncates oversized code', () => {
    installMonaco([editor(model('a'.repeat(20), 'python'))]);
    expect(readMonacoInPage(10)).toEqual({
      ok: true,
      code: 'a'.repeat(10),
      languageId: 'python',
      truncated: true,
    });
  });
});
