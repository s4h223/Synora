import { extractProblemFromDom } from './dom';

/**
 * Synthetic markup mirroring the structure LeetCode's problem page uses
 * (see selectors.ts). If LeetCode changes its markup, update both together and
 * re-verify against the live site.
 */
const PAGE = `
  <div class="flex">
    <div class="text-title-large"><a href="/problems/two-sum/" class="no-underline truncate">1. Two Sum</a></div>
    <div class="relative inline-flex text-difficulty-easy">Easy</div>
    <a href="/tag/array/">Array</a>
    <a href="/tag/hash-table/">Hash Table</a>
    <a href="/tag/array/">Array</a>
    <div data-track-load="description_content">
      <p>Find two numbers that add up to <code>target</code>.</p>
      <p><strong>Constraints:</strong></p>
      <ul><li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li></ul>
    </div>
  </div>`;

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('extractProblemFromDom', () => {
  it('extracts the essentials from the rendered page', () => {
    const problem = extractProblemFromDom(makeDoc(PAGE), 'two-sum');
    expect(problem).toMatchObject({
      frontendId: '1',
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: 'Easy',
      constraints: ['`2 <= nums.length <= 10^4`'],
      tags: [
        { name: 'Array', slug: 'array' },
        { name: 'Hash Table', slug: 'hash-table' },
      ],
      source: 'dom',
      signature: null,
    });
    expect(problem?.description).toContain('Find two numbers that add up to `target`.');
  });

  it('returns null when the description is missing', () => {
    const doc = makeDoc('<div class="text-title-large"><a href="/problems/x/">1. X</a></div>');
    expect(extractProblemFromDom(doc, 'x')).toBeNull();
  });

  it('keeps the raw title when it has no number prefix', () => {
    const doc = makeDoc(
      '<div class="text-title-large"><a href="/problems/x/">Mystery</a></div><div data-track-load="description_content"><p>d</p></div>',
    );
    expect(extractProblemFromDom(doc, 'x')).toMatchObject({ title: 'Mystery', frontendId: '' });
  });
});
