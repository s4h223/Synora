import { prepareHistory } from './history';
import type { ChatTurn } from './types';

const withCode = (n: number): ChatTurn => ({
  role: 'user',
  content: `<student_code language="Python">\n1| v${n}\n</student_code>\n\nquestion ${n}`,
});
const reply = (n: number): ChatTurn => ({ role: 'assistant', content: `answer ${n}` });

describe('prepareHistory', () => {
  it('keeps code only in the two most recent user turns', () => {
    const out = prepareHistory([withCode(1), reply(1), withCode(2), reply(2), withCode(3)]);
    expect(out[0]!.content).toContain('[earlier version of their code omitted]');
    expect(out[0]!.content).toContain('question 1');
    expect(out[2]!.content).toContain('1| v2');
    expect(out[4]!.content).toContain('1| v3');
  });

  it('drops the oldest turns beyond the budget', () => {
    const turns: ChatTurn[] = [
      { role: 'user', content: 'a'.repeat(50) },
      reply(1),
      { role: 'user', content: 'b'.repeat(50) },
    ];
    // "a…" no longer fits; the leading assistant reply is then dropped too.
    expect(prepareHistory(turns, 60)).toEqual([{ role: 'user', content: 'b'.repeat(50) }]);
  });

  it('always keeps the latest turn even if it exceeds the budget', () => {
    expect(prepareHistory([{ role: 'user', content: 'x'.repeat(500) }], 10)).toHaveLength(1);
  });

  it('never starts with an assistant turn', () => {
    expect(prepareHistory([reply(0), { role: 'user', content: 'hi' }])[0]!.role).toBe('user');
  });
});
