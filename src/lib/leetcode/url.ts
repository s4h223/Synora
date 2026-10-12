const LEETCODE_HOSTS = new Set(['leetcode.com', 'www.leetcode.com']);
const PROBLEM_PATH = /^\/problems\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/;

export type LeetCodeUrlInfo =
  | { kind: 'problem'; slug: string; canonicalUrl: string }
  | { kind: 'contest' }
  | { kind: 'other-leetcode' }
  | { kind: 'not-leetcode' };

/**
 * Classify a tab URL. Only `/problems/<slug>` pages are supported; contest pages
 * are deliberately excluded so Synora can't be used during contests.
 */
export function classifyUrl(rawUrl: string | undefined | null): LeetCodeUrlInfo {
  if (!rawUrl) return { kind: 'not-leetcode' };

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: 'not-leetcode' };
  }

  if (url.protocol !== 'https:' || !LEETCODE_HOSTS.has(url.hostname)) {
    return { kind: 'not-leetcode' };
  }
  if (url.pathname.startsWith('/contest/')) return { kind: 'contest' };

  const match = PROBLEM_PATH.exec(url.pathname);
  if (!match?.[1]) return { kind: 'other-leetcode' };

  const slug = match[1];
  return { kind: 'problem', slug, canonicalUrl: problemUrl(slug) };
}

export function problemUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}
