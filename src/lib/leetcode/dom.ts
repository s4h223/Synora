import { extractConstraints, htmlToText } from './description';
import { SELECTORS } from './selectors';
import type { Difficulty, Problem } from './types';
import { problemUrl } from './url';

/**
 * Best-effort extraction from the rendered page, used only when GraphQL fails.
 * Returns null if the essentials (title + description) can't be found.
 */
export function extractProblemFromDom(doc: Document, slug: string): Problem | null {
  const titleEl = SELECTORS.title
    .map((selector) => doc.querySelector(selector))
    .find((el): el is Element => el !== null);
  const descriptionEl = doc.querySelector(SELECTORS.description);
  if (!titleEl || !descriptionEl) return null;

  const rawTitle = (titleEl.textContent ?? '').trim();
  const titleMatch = /^(\d+)\.\s*(.+)$/.exec(rawTitle);
  const html = descriptionEl.innerHTML;

  const tags = Array.from(doc.querySelectorAll<HTMLAnchorElement>(SELECTORS.tags)).map((a) => ({
    name: (a.textContent ?? '').trim(),
    slug: a.getAttribute('href')?.split('/').filter(Boolean).pop() ?? '',
  }));

  return {
    id: titleMatch?.[1] ?? '',
    frontendId: titleMatch?.[1] ?? '',
    slug,
    title: titleMatch?.[2] ?? rawTitle,
    url: problemUrl(slug),
    difficulty: readDifficulty(doc),
    isPaidOnly: false,
    description: htmlToText(html),
    constraints: extractConstraints(html),
    exampleInputs: [],
    tags: dedupeBySlug(tags.filter((t) => t.name && t.slug)),
    signature: null,
    solvedStatus: null,
    source: 'dom',
  };
}

function readDifficulty(doc: Document): Difficulty | null {
  const el = doc.querySelector(SELECTORS.difficulty);
  const match = /text-difficulty-(easy|medium|hard)/.exec(el?.className ?? '');
  if (!match?.[1]) return null;
  return (match[1].charAt(0).toUpperCase() + match[1].slice(1)) as Difficulty;
}

function dedupeBySlug<T extends { slug: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.slug) && seen.add(item.slug));
}
