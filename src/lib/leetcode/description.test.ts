import fixture from '../../../tests/fixtures/leetcode/two-sum.graphql.json';
import { extractConstraints, htmlToText } from './description';

const html = fixture.data.question.content;

describe('htmlToText', () => {
  const text = htmlToText(html);

  it('keeps inline code and renders superscripts as exponents', () => {
    expect(text).toContain('Given an array of integers `nums` and an integer `target`');
    expect(text).toContain('`O(n^2)`');
  });

  it('renders examples as fenced blocks without markdown inside', () => {
    expect(text).toContain('```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\n```');
  });

  it('renders list items as bullets', () => {
    expect(text).toContain('- `2 <= nums.length <= 10^4`');
  });

  it('decodes entities and drops HTML', () => {
    expect(text).not.toMatch(/<[a-z]/i);
    expect(text).not.toContain('&lt;');
    expect(text).not.toContain(' ');
  });

  it('collapses excess blank lines', () => {
    expect(text).not.toMatch(/\n{3,}/);
  });

  it('never executes or preserves scripts', () => {
    expect(htmlToText('<p>hi</p><script>alert(1)</script><img src=x onerror="alert(2)">')).toBe(
      'hi\n\n[image]',
    );
  });
});

describe('extractConstraints', () => {
  it('returns each constraint as one line', () => {
    expect(extractConstraints(html)).toEqual([
      '`2 <= nums.length <= 10^4`',
      '`-10^9 <= nums[i] <= 10^9`',
      '**Only one valid answer exists.**',
    ]);
  });

  it('returns an empty list when there is no constraints section', () => {
    expect(extractConstraints('<p>No constraints here</p><ul><li>x</li></ul>')).toEqual([]);
  });
});
