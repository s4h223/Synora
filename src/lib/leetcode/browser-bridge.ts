import { z } from 'zod/mini';
import type { ProblemResolverDeps } from './active-problem';
import { type EditorReadResult, MAX_CODE_CHARS, readMonacoInPage } from './editor';
import type { GetProblemResponse } from './types';

/** Path WXT emits for `entrypoints/leetcode.content.ts`. */
const CONTENT_SCRIPT_FILE = '/content-scripts/leetcode.js';

export const browserProblemDeps: ProblemResolverDeps = {
  requestProblem: (tabId) =>
    browser.tabs.sendMessage(tabId, { type: 'synora:get-problem' }) as Promise<GetProblemResponse>,
  injectContentScript: async (tabId) => {
    await browser.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT_FILE] });
  },
};

// Results from the page's MAIN world are untrusted (any page script could define
// `window.monaco`), so validate before use.
const editorResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    code: z.string().check(z.maxLength(MAX_CODE_CHARS)),
    languageId: z.string().check(z.maxLength(40)),
    truncated: z.boolean(),
  }),
  z.object({ ok: z.literal(false), reason: z.enum(['no-editor', 'empty']) }),
]);

/** Read the current editor contents from a LeetCode tab. Only call on explicit user action. */
export async function readEditorCode(tabId: number): Promise<EditorReadResult> {
  try {
    const [injection] = await browser.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: readMonacoInPage,
      args: [MAX_CODE_CHARS],
    });
    const parsed = editorResultSchema.safeParse(injection?.result);
    if (parsed.success) return parsed.data;
    return { ok: false, reason: 'injection-failed', message: 'Unexpected editor response' };
  } catch (error) {
    return {
      ok: false,
      reason: 'injection-failed',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
