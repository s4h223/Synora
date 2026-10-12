import { findPitfalls } from './pitfalls';

const ids = (line: string, lang: string) => findPitfalls(line, lang).map((p) => p.id);

describe('findPitfalls', () => {
  it.each([
    ['res = nums.sort()', 'python', 'py-sort-returns-none'],
    ['def dfs(node, path=[]):', 'python', 'py-mutable-default'],
    ['if x is 5:', 'python', 'py-is-literal'],
    ['node = queue.pop(0)', 'python', 'py-pop-front'],
    ['int mid = (lo + hi) / 2;', 'java', 'mid-overflow'],
    ['int mid = (l + r) >> 1;', 'cpp', 'mid-overflow'],
    ['if (s == "abc") {', 'java', 'java-string-eq'],
    ['for (int i = 0; i < v.size() - 1; i++)', 'cpp', 'cpp-size-minus'],
    ['nums.sort();', 'javascript', 'js-sort-default'],
    ['const grid = new Array(n).fill([]);', 'typescript', 'js-fill-shared'],
  ])('flags %s (%s)', (line, lang, id) => {
    expect(ids(line, lang)).toContain(id);
  });

  it.each([
    ['nums.sort()', 'python'],
    ['ans = sorted(nums)', 'python'],
    ['if node is None:', 'python'],
    ['def dfs(node, path=None):', 'python'],
    ['q.popleft()', 'python'],
    ['int mid = lo + (hi - lo) / 2;', 'java'],
    ['mid = (lo + hi) // 2', 'python'],
    ['if (s.equals("abc")) {', 'java'],
    ["if (c == 'a') {", 'java'],
    ['nums.sort((a, b) => a - b);', 'javascript'],
    ['# res = nums.sort()', 'python'],
    ['print("x is 5")', 'python'],
  ])('does not flag correct code: %s', (line, lang) => {
    expect(ids(line, lang)).toEqual([]);
  });
});
