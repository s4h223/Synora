export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface ProblemTag {
  name: string;
  slug: string;
}

export interface ProblemParam {
  name: string;
  /** LeetCode's type notation, e.g. `integer[]`, `string`, `ListNode`. */
  type: string;
}

export interface ProblemSignature {
  functionName: string;
  params: ProblemParam[];
  returnType: string;
}

export interface Problem {
  /** LeetCode's internal question id. */
  id: string;
  /** The number shown to users ("1. Two Sum"). */
  frontendId: string;
  slug: string;
  title: string;
  url: string;
  difficulty: Difficulty | null;
  isPaidOnly: boolean;
  /** Description as readable text (markdown-ish). Null when locked or unavailable. */
  description: string | null;
  /** Each constraint as a separate readable line. */
  constraints: string[];
  /** Raw example inputs, one string per example (arguments separated by newlines). */
  exampleInputs: string[];
  tags: ProblemTag[];
  /** Function signature for standard problems; null for design/class problems or when unknown. */
  signature: ProblemSignature | null;
  /** The logged-in user's status for this problem, when LeetCode reports it. */
  solvedStatus: 'ac' | 'notac' | null;
  /** Where the data came from. DOM extraction is a less complete fallback. */
  source: 'graphql' | 'dom';
}

/** Messages exchanged between the side panel and the LeetCode content script. */
export type ContentRequest = { type: 'synora:get-problem' };

export type GetProblemResponse =
  | { ok: true; problem: Problem }
  | { ok: false; reason: 'not-problem-page' | 'not-found' | 'fetch-failed'; message?: string };
