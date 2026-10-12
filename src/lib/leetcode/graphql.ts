import { z } from 'zod/mini';
import { extractConstraints, htmlToText } from './description';
import type { Difficulty, Problem, ProblemSignature } from './types';
import { problemUrl } from './url';

/**
 * LeetCode's GraphQL API is undocumented. Everything it returns is validated
 * here so a schema change degrades into a clear error instead of bad data.
 */
export const QUESTION_QUERY = `query synoraQuestion($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    questionFrontendId
    title
    titleSlug
    difficulty
    isPaidOnly
    content
    status
    exampleTestcaseList
    topicTags { name slug }
    metaData
  }
}`;

const questionSchema = z.object({
  questionId: z.string(),
  questionFrontendId: z.string(),
  title: z.string(),
  titleSlug: z.string(),
  difficulty: z.nullish(z.string()),
  isPaidOnly: z.nullish(z.boolean()),
  content: z.nullish(z.string()),
  status: z.nullish(z.string()),
  exampleTestcaseList: z.nullish(z.array(z.string())),
  topicTags: z.nullish(z.array(z.object({ name: z.string(), slug: z.string() }))),
  metaData: z.nullish(z.string()),
});

const responseSchema = z.object({
  data: z.nullish(z.object({ question: z.nullable(questionSchema) })),
  errors: z.nullish(z.array(z.object({ message: z.string() }))),
});

const metaDataSchema = z.object({
  name: z.string(),
  params: z.array(z.object({ name: z.string(), type: z.string() })),
  return: z.object({ type: z.string() }),
});

export type RawQuestion = z.infer<typeof questionSchema>;

export class LeetCodeApiError extends Error {
  constructor(
    message: string,
    readonly kind: 'http' | 'graphql' | 'schema' | 'network',
  ) {
    super(message);
    this.name = 'LeetCodeApiError';
  }
}

/** Parse a raw GraphQL response body. Returns null when the problem doesn't exist. */
export function parseQuestionResponse(body: unknown): RawQuestion | null {
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) {
    throw new LeetCodeApiError('Unexpected response shape from LeetCode', 'schema');
  }
  if (parsed.data.errors?.length && !parsed.data.data?.question) {
    throw new LeetCodeApiError(parsed.data.errors.map((e) => e.message).join('; '), 'graphql');
  }
  return parsed.data.data?.question ?? null;
}

export function normalizeQuestion(raw: RawQuestion): Problem {
  const html = raw.content ?? null;
  return {
    id: raw.questionId,
    frontendId: raw.questionFrontendId,
    slug: raw.titleSlug,
    title: raw.title,
    url: problemUrl(raw.titleSlug),
    difficulty: toDifficulty(raw.difficulty),
    isPaidOnly: raw.isPaidOnly ?? false,
    description: html ? htmlToText(html) : null,
    constraints: html ? extractConstraints(html) : [],
    exampleInputs: raw.exampleTestcaseList ?? [],
    tags: raw.topicTags ?? [],
    signature: parseSignature(raw.metaData),
    solvedStatus: raw.status === 'ac' || raw.status === 'notac' ? raw.status : null,
    source: 'graphql',
  };
}

export function toDifficulty(value: string | null | undefined): Difficulty | null {
  return value === 'Easy' || value === 'Medium' || value === 'Hard' ? value : null;
}

/** metaData is a JSON string. Design problems use a different shape and yield null. */
export function parseSignature(metaData: string | null | undefined): ProblemSignature | null {
  if (!metaData) return null;
  try {
    const parsed = metaDataSchema.safeParse(JSON.parse(metaData));
    if (!parsed.success) return null;
    return {
      functionName: parsed.data.name,
      params: parsed.data.params,
      returnType: parsed.data.return.type,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a problem from LeetCode's GraphQL endpoint. Intended to run in the
 * content script, where the request is same-origin with the user's session.
 */
export async function fetchQuestion(
  slug: string,
  fetchImpl: typeof fetch = fetch,
  csrfToken: string | null = null,
): Promise<Problem | null> {
  let res: Response;
  try {
    res = await fetchImpl('https://leetcode.com/graphql/', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'x-csrftoken': csrfToken } : {}),
      },
      body: JSON.stringify({ query: QUESTION_QUERY, variables: { titleSlug: slug } }),
    });
  } catch (error) {
    throw new LeetCodeApiError(
      error instanceof Error ? error.message : 'Network request failed',
      'network',
    );
  }

  if (!res.ok) throw new LeetCodeApiError(`LeetCode responded with HTTP ${res.status}`, 'http');

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new LeetCodeApiError('LeetCode returned invalid JSON', 'schema');
  }

  const raw = parseQuestionResponse(body);
  return raw ? normalizeQuestion(raw) : null;
}

/** Read LeetCode's CSRF cookie, if present. */
export function readCsrfToken(cookie: string): string | null {
  const match = /(?:^|;\s*)csrftoken=([^;]+)/.exec(cookie);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
