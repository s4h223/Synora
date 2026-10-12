import { LINE_HREF_PREFIX, lineFromHref, linkifyLineRefs } from './markdown-utils';

describe('linkifyLineRefs', () => {
  it('links "line N" mentions in prose', () => {
    expect(linkifyLineRefs('Look at line 4 and Line 12.')).toBe(
      `Look at [line 4](${LINE_HREF_PREFIX}4) and [Line 12](${LINE_HREF_PREFIX}12).`,
    );
  });

  it('never touches inline code or fenced blocks', () => {
    const md = 'See `line 3` here.\n```python\n# line 5\n```\nThen line 6.';
    expect(linkifyLineRefs(md)).toBe(
      `See \`line 3\` here.\n\`\`\`python\n# line 5\n\`\`\`\nThen [line 6](${LINE_HREF_PREFIX}6).`,
    );
  });

  it('leaves an unterminated code block alone while streaming', () => {
    expect(linkifyLineRefs('```py\nline 2')).toBe('```py\nline 2');
  });

  it('does not link words that merely contain "line"', () => {
    expect(linkifyLineRefs('a pipeline 5 deadline 3')).toBe('a pipeline 5 deadline 3');
  });
});

describe('lineFromHref', () => {
  it('parses only Synora line links', () => {
    expect(lineFromHref(`${LINE_HREF_PREFIX}7`)).toBe(7);
    expect(lineFromHref(`${LINE_HREF_PREFIX}0`)).toBeNull();
    expect(lineFromHref('https://example.com')).toBeNull();
    expect(lineFromHref(undefined)).toBeNull();
  });
});
