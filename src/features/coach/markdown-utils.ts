export const LINE_HREF_PREFIX = '#synora-line-';

const LINE_REF = /\b([Ll]ines?)\s+(\d{1,4})\b/g;

/**
 * Turn "line 12" mentions into links the renderer shows as editor jump buttons.
 * Skips fenced code blocks and inline code so code is never altered.
 */
export function linkifyLineRefs(markdown: string): string {
  return markdown
    .split(/(```[\s\S]*?(?:```|$))/g)
    .map((block, i) =>
      i % 2 === 1
        ? block
        : block
            .split(/(`[^`\n]*`)/g)
            .map((part, j) =>
              j % 2 === 1
                ? part
                : part.replace(
                    LINE_REF,
                    (_m, word: string, line: string) =>
                      `[${word} ${line}](${LINE_HREF_PREFIX}${line})`,
                  ),
            )
            .join(''),
    )
    .join('');
}

export function lineFromHref(href: string | undefined): number | null {
  if (!href?.startsWith(LINE_HREF_PREFIX)) return null;
  const line = Number(href.slice(LINE_HREF_PREFIX.length));
  return Number.isInteger(line) && line > 0 ? line : null;
}
