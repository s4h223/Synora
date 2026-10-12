import { classifyUrl } from './url';

describe('classifyUrl', () => {
  it.each([
    ['https://leetcode.com/problems/two-sum/', 'two-sum'],
    ['https://leetcode.com/problems/two-sum', 'two-sum'],
    ['https://leetcode.com/problems/two-sum/description/', 'two-sum'],
    ['https://leetcode.com/problems/two-sum/submissions/123456/', 'two-sum'],
    ['https://www.leetcode.com/problems/3sum/?envType=study-plan', '3sum'],
  ])('detects the problem slug in %s', (url, slug) => {
    expect(classifyUrl(url)).toEqual({
      kind: 'problem',
      slug,
      canonicalUrl: `https://leetcode.com/problems/${slug}/`,
    });
  });

  it('excludes contest pages, including contest problems', () => {
    expect(classifyUrl('https://leetcode.com/contest/weekly-contest-400/')).toEqual({
      kind: 'contest',
    });
    expect(
      classifyUrl('https://leetcode.com/contest/weekly-contest-400/problems/some-problem/'),
    ).toEqual({ kind: 'contest' });
  });

  it.each([
    'https://leetcode.com/problemset/',
    'https://leetcode.com/',
    'https://leetcode.com/problems/',
  ])('treats %s as a non-problem LeetCode page', (url) => {
    expect(classifyUrl(url).kind).toBe('other-leetcode');
  });

  it.each([
    undefined,
    '',
    'not a url',
    'https://example.com/problems/two-sum/',
    'http://leetcode.com/problems/two-sum/',
    'https://leetcode.cn/problems/two-sum/',
    'https://leetcode.com.evil.example/problems/two-sum/',
  ])('rejects %s', (url) => {
    expect(classifyUrl(url).kind).toBe('not-leetcode');
  });

  it('rejects malformed slugs', () => {
    expect(classifyUrl('https://leetcode.com/problems/Two_Sum/').kind).toBe('other-leetcode');
  });
});
