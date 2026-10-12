import { AiError, type AiProvider, type ChatResult } from './types';

/**
 * Scripted provider for development and testing: streams canned replies so the
 * whole Coach flow (streaming, markdown, code blocks, line links, stop, pair
 * mode) can be exercised without an API key or spending money.
 * Only offered in development builds; it is not a tutor.
 */
export function createDemoProvider(delayMs = 15): AiProvider {
  return {
    async streamChat(req, handlers): Promise<ChatResult> {
      const last = req.messages.at(-1)?.content ?? '';
      const reply = /"speak"/.test(last) ? pairReply(last) : chatReply(last);

      for (const token of reply.match(/\S+\s*|\s+/g) ?? []) {
        if (req.signal?.aborted) throw new AiError('aborted');
        handlers.onText(token);
        await new Promise((r) => setTimeout(r, delayMs));
      }
      return { stopReason: 'end', servedBy: 'demo' };
    },
    async listModels() {
      return ['demo-tutor'];
    },
  };
}

function chatReply(prompt: string): string {
  const hasCode = prompt.includes('<student_code');
  return [
    '**Demo reply** (scripted, not a real model).',
    '',
    hasCode
      ? 'I can see your code. Take a look at line 2: what does it return when the input is empty?'
      : 'I don’t have your code yet. Turn on Live code access to share it.',
    '',
    'Here’s a code block to check highlighting:',
    '',
    '```python',
    'seen = {}',
    'for i, n in enumerate(nums):',
    '    if target - n in seen:',
    '        return [seen[target - n], i]',
    '    seen[n] = i',
    '```',
    '',
    '- Lists render',
    '- `inline code` renders',
  ].join('\n');
}

function pairReply(prompt: string): string {
  const line = /cursor is on line (\d+)/.exec(prompt)?.[1] ?? 'null';
  return JSON.stringify({
    speak: true,
    kind: 'tip',
    message: `Demo nudge: nice progress. Double-check line ${line === 'null' ? 1 : line} handles an empty input.`,
    line: line === 'null' ? null : Number(line),
  });
}
