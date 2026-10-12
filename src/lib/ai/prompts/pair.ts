import { z } from 'zod/mini';
import type { PairMode } from '@/lib/settings';
import { type CodeForPrompt, formatCode } from './tutor';

export const pairVerdictSchema = z.object({
  speak: z.boolean(),
  kind: z.optional(z.enum(['bug', 'stuck', 'tip', 'praise', 'question'])),
  message: z.optional(z.string().check(z.maxLength(600))),
  line: z.optional(z.nullable(z.number().check(z.int(), z.minimum(1)))),
});
export type PairVerdict = z.infer<typeof pairVerdictSchema>;

const MODE_RULES: Record<Exclude<PairMode, 'off'>, string> = {
  quiet:
    'Speak ONLY if there is a likely bug, a misunderstanding of the problem, or they are heading in a clearly wrong direction. Otherwise stay silent.',
  active:
    'Speak if you can help: a likely bug, a wrong direction, a useful tip, a short explanation of something they just wrote (especially for beginners), or brief encouragement for real progress. Stay silent if nothing is worth interrupting for.',
};

/**
 * One-shot check while the student pauses typing. The model must answer with a
 * small JSON verdict; most checks should end in silence.
 */
export function buildPairCheckTurn(
  code: CodeForPrompt,
  mode: Exclude<PairMode, 'off'>,
  alreadySaid: string[],
): string {
  const recent = alreadySaid.length
    ? `\nYou already told them (do not repeat): ${alreadySaid.map((s) => JSON.stringify(s)).join('; ')}`
    : '';
  return `<synora>Pair mode check. The student is writing code live and just paused; their cursor is on line ${code.cursorLine ?? 1}. Decide whether to say something, like a pair programmer glancing at their screen.
${MODE_RULES[mode]}
Never give the full solution or write their code for them. Keep the message under 60 words, friendly, and specific (cite "line N" if relevant).${recent}
Respond with ONLY a JSON object and nothing else: {"speak": boolean, "kind": "bug" | "stuck" | "tip" | "praise" | "question", "message": string, "line": number | null}</synora>

${formatCode(code)}`;
}

/** Parse the model's verdict leniently (models sometimes wrap JSON in prose or fences). */
export function parsePairVerdict(raw: string): PairVerdict | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = pairVerdictSchema.safeParse(JSON.parse(raw.slice(start, end + 1)));
    if (!parsed.success) return null;
    if (parsed.data.speak && !parsed.data.message?.trim()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
