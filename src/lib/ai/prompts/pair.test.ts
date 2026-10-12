import { buildPairCheckTurn, parsePairVerdict } from './pair';

describe('buildPairCheckTurn', () => {
  it('describes the mode, cursor, and what was already said', () => {
    const turn = buildPairCheckTurn(
      { code: 'x = 1', languageId: 'python', cursorLine: 1 },
      'quiet',
      ['Check line 3'],
    );
    expect(turn).toContain('cursor is on line 1');
    expect(turn).toContain('Speak ONLY if there is a likely bug');
    expect(turn).toContain('do not repeat): "Check line 3"');
    expect(turn).toContain('<student_code language="Python" cursor_line="1">');
  });
});

describe('parsePairVerdict', () => {
  it('parses a bare JSON verdict', () => {
    expect(
      parsePairVerdict('{"speak":true,"kind":"bug","message":"Off by one on line 4","line":4}'),
    ).toEqual({ speak: true, kind: 'bug', message: 'Off by one on line 4', line: 4 });
  });

  it('tolerates prose and code fences around the JSON', () => {
    expect(
      parsePairVerdict(
        'Sure!\n```json\n{"speak": false, "kind": "tip", "message": "", "line": null}\n```',
      ),
    ).toMatchObject({ speak: false });
  });

  it('rejects malformed or empty verdicts', () => {
    expect(parsePairVerdict('no json here')).toBeNull();
    expect(parsePairVerdict('{"speak": "yes"}')).toBeNull();
    expect(parsePairVerdict('{"speak": true, "message": "  "}')).toBeNull();
    expect(parsePairVerdict('{"speak": true, "message": "hi", "line": 0}')).toBeNull();
  });
});
