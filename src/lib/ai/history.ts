import type { ChatTurn } from './types';

/** Character budget for prior conversation sent with each request (~10k tokens). */
export const HISTORY_CHAR_BUDGET = 40_000;
/** Only the most recent turns keep their full code; older code is replaced by a stub. */
export const TURNS_WITH_CODE = 2;

const CODE_BLOCK = /<student_code[^>]*>[\s\S]*?<\/student_code>/g;

/**
 * Prepare stored turns for a request: drop old code snapshots (the latest code
 * is what matters), keep the newest turns within budget, and make sure the
 * history starts with a user turn (some providers require it).
 */
export function prepareHistory(turns: ChatTurn[], budget = HISTORY_CHAR_BUDGET): ChatTurn[] {
  let userTurnsSeen = 0;
  const stripped = [...turns].reverse().map((turn) => {
    if (turn.role !== 'user' || !turn.content.includes('<student_code')) return turn;
    userTurnsSeen += 1;
    if (userTurnsSeen <= TURNS_WITH_CODE) return turn;
    return {
      ...turn,
      content: turn.content.replace(CODE_BLOCK, '[earlier version of their code omitted]'),
    };
  });

  const kept: ChatTurn[] = [];
  let used = 0;
  for (const turn of stripped) {
    if (kept.length > 0 && used + turn.content.length > budget) break;
    kept.push(turn);
    used += turn.content.length;
  }
  kept.reverse();

  while (kept[0]?.role === 'assistant') kept.shift();
  return kept;
}
