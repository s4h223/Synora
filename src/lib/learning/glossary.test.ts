import { glossaryFor, lookupLine } from './glossary';
import { languageFamily } from './language';

const ids = (line: string, lang: string, word = '') =>
  lookupLine(line, lang, word).map((e) => e.id);

describe('lookupLine', () => {
  it('finds Python built-ins in order of appearance', () => {
    expect(ids('        for i, n in enumerate(nums):', 'python')).toEqual([
      'py-enumerate',
      'py-for',
    ]);
  });

  it('puts the hovered word first', () => {
    expect(ids('seen = defaultdict(int); n = len(nums)', 'python', 'len')[0]).toBe('py-len');
  });

  it('distinguishes membership `in` from `for … in`', () => {
    expect(ids('if target - n in seen:', 'python')).toContain('py-in');
    expect(ids('for x in nums:', 'python')).not.toContain('py-in');
  });

  it('matches methods only when called on something', () => {
    expect(ids('stack.pop()', 'python')).toContain('py-pop');
    expect(ids('pop = 3', 'python')).not.toContain('py-pop');
  });

  it('ignores words inside strings and comments', () => {
    expect(ids('print("use enumerate here")  # range', 'python')).toEqual([]);
    expect(ids('// HashMap is great', 'java')).toEqual([]);
  });

  it('recognises float("inf") from the raw line', () => {
    expect(ids("best = float('inf')", 'python')).toContain('py-inf');
  });

  it('covers Java, C++ and TypeScript', () => {
    expect(ids('Map<Integer, Integer> seen = new HashMap<>();', 'java')).toContain('java-hashmap');
    expect(ids('for (int i = 0; i < nums.length; i++) {', 'java')).toContain('java-length');
    expect(ids('unordered_map<int, int> m;', 'cpp')).toEqual(['cpp-umap']);
    expect(ids('nums.sort();', 'typescript')).toContain('js-sort');
  });

  it('caps the number of entries', () => {
    expect(lookupLine('a = sorted(set(range(len(x))))', 'python', '', 2)).toHaveLength(2);
  });

  it('returns nothing for unsupported languages or blank lines', () => {
    expect(lookupLine('let mut v = Vec::new();', 'rust')).toEqual([]);
    expect(lookupLine('   ', 'python')).toEqual([]);
  });
});

describe('glossary content', () => {
  it('has unique ids and non-empty summaries', () => {
    const all = ['python', 'java', 'cpp', 'javascript'].flatMap((f) =>
      glossaryFor(languageFamily(f)),
    );
    const unique = new Map(all.map((e) => [e.id, e]));
    for (const entry of unique.values()) {
      expect(entry.summary.length).toBeGreaterThan(5);
      expect(entry.tokens || entry.methods || entry.test).toBeTruthy();
    }
  });
});
