import { type LangFamily, languageFamily, stripLiteralsAndComments } from './language';

/**
 * High-precision checks for mistakes that are almost always real. Shown as
 * "possible pitfall" with an explanation. False positives teach the wrong
 * lesson, so only add a rule when the pattern is unambiguous.
 */
export interface Pitfall {
  id: string;
  title: string;
  explanation: string;
}

interface Rule extends Pitfall {
  families: LangFamily[];
  /** Tested on the line with string literals and comments removed, unless `raw` is set. */
  test: (code: string) => boolean;
  raw?: boolean;
}

const RULES: Rule[] = [
  {
    id: 'py-sort-returns-none',
    families: ['python'],
    test: (c) => /=\s*[\w.\])]+\.sort\(/.test(c),
    title: '`.sort()` returns None',
    explanation:
      'list.sort() sorts in place and returns None, so the variable on the left becomes None. Use `sorted(...)` to get a new list.',
  },
  {
    id: 'py-mutable-default',
    families: ['python'],
    test: (c) => /\bdef\s+\w+\s*\([^)]*=\s*(\[\s*\]|\{\s*\}|set\(\s*\))/.test(c),
    title: 'Mutable default argument',
    explanation:
      'A default like `=[]` is created once and shared between calls, so values leak from one call to the next. Use `=None` and create the list inside.',
  },
  {
    id: 'py-is-literal',
    families: ['python'],
    // Strings are already replaced with "" here, so `x is "a"` shows up as `is ""`.
    test: (c) => /\bis\s+(not\s+)?(-?\d|"")/.test(c),
    title: '`is` compares identity, not value',
    explanation:
      'Use `==` to compare numbers and strings. `is` is for `None` (and checking the same object).',
  },
  {
    id: 'py-pop-front',
    families: ['python'],
    test: (c) => /\.pop\(\s*0\s*\)/.test(c),
    title: '`pop(0)` is O(n)',
    explanation:
      'Removing the first item shifts every other item. In a loop this becomes O(n²). Use `collections.deque` and `popleft()`.',
  },
  {
    id: 'mid-overflow',
    families: ['java', 'cpp'],
    test: (c) => /\(\s*\w+\s*\+\s*\w+\s*\)\s*(\/\s*2\b|>>\s*1\b)/.test(c),
    title: 'Possible overflow in the midpoint',
    explanation:
      '`(lo + hi) / 2` can exceed the int range when both are large. `lo + (hi - lo) / 2` gives the same result without overflowing.',
  },
  {
    id: 'java-string-eq',
    families: ['java'],
    raw: true,
    test: (c) => /[\w)]\s*[!=]=\s*"|"\s*[!=]=\s*[\w(]/.test(stripComment(c, '//')),
    title: 'Comparing Strings with ==',
    explanation:
      '`==` checks whether two Strings are the same object, not the same text. Use `a.equals(b)`.',
  },
  {
    id: 'cpp-size-minus',
    families: ['cpp'],
    test: (c) => /\.size\(\)\s*-\s*\d/.test(c),
    title: '`size() - 1` can underflow',
    explanation:
      '`size()` is unsigned, so when the container is empty `size() - 1` wraps to a huge number. Cast to int first or check for empty.',
  },
  {
    id: 'js-sort-default',
    families: ['javascript'],
    test: (c) => /\.sort\(\s*\)/.test(c),
    title: '`.sort()` sorts as text',
    explanation:
      'Numbers are compared as strings: [10, 2, 1] becomes [1, 10, 2]. Use `.sort((a, b) => a - b)`.',
  },
  {
    id: 'js-fill-shared',
    families: ['javascript'],
    test: (c) => /\.fill\(\s*(\[\s*\]|\{\s*\})\s*\)/.test(c),
    title: '`.fill([])` shares one array',
    explanation:
      'Every slot holds the same array, so changing one changes all. Use `Array.from({ length: n }, () => [])`.',
  },
];

function stripComment(line: string, marker = '#'): string {
  const index = line.indexOf(marker);
  return index === -1 ? line : line.slice(0, index);
}

export function findPitfalls(lineText: string, languageId: string): Pitfall[] {
  const family = languageFamily(languageId);
  const code = stripLiteralsAndComments(lineText, family);
  return RULES.filter((r) => r.families.includes(family))
    .filter((r) => r.test(r.raw ? lineText : code))
    .map(({ id, title, explanation }) => ({ id, title, explanation }));
}
