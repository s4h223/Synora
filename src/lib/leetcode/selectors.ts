/**
 * Every LeetCode DOM selector lives here. LeetCode changes its markup without
 * notice; when extraction breaks, this is the only file that should change.
 *
 * These are a FALLBACK. Problem data comes from GraphQL first.
 */
export const SELECTORS = {
  /** The rendered problem statement (same HTML GraphQL returns in `content`). */
  description: '[data-track-load="description_content"]',
  /** Problem title link, e.g. "1. Two Sum". */
  title: [
    'div.text-title-large a[href^="/problems/"]',
    'a[href^="/problems/"].no-underline.truncate',
  ],
  /** Difficulty pill; the class encodes the level. */
  difficulty: '[class*="text-difficulty-"]',
  /** Topic tag links. */
  tags: 'a[href^="/tag/"]',
} as const;
