import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useMemo } from 'react';
import { db } from '@/lib/db/schema';
import type { Problem } from '@/lib/leetcode/types';
import { useCodeStore } from '../context/code-store';
import { useSettings } from '../settings/use-settings';
import {
  type AttachedCode,
  createConversation,
  getOrCreateConversation,
  listMessages,
  retryTurn,
  sendTurn,
  settleInterrupted,
  type TurnInput,
} from './coach-service';
import { coachDeps, useCoachStore } from './coach-store';

let controller: AbortController | null = null;

export type SendOptions = Pick<
  TurnInput,
  'display' | 'kind' | 'instruction' | 'hintLevel' | 'action'
> & {
  /** Force-include the selection even if code isn't attached. */
  withSelection?: boolean;
};

/** Everything the Coach UI needs for the current problem. */
export function useCoach(problem: Problem) {
  const { settings } = useSettings();
  const conversationId = useCoachStore((s) => s.conversationId);
  const streamingId = useCoachStore((s) => s.streamingId);
  const attachCode = useCoachStore((s) => s.attachCode);
  const code = useCodeStore((s) => s.bySlug[problem.slug]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const conversation = await getOrCreateConversation(db, problem.slug);
      await settleInterrupted(db, conversation.id);
      if (active) useCoachStore.getState().set({ conversationId: conversation.id });
    })();
    return () => {
      active = false;
    };
  }, [problem.slug]);

  const messages = useLiveQuery(
    () => (conversationId ? listMessages(db, conversationId) : Promise.resolve([])),
    [conversationId],
  );

  const hintLevel = useMemo(
    () =>
      (messages ?? []).reduce(
        (max, m) => (m.role === 'user' && m.hintLevel ? Math.max(max, m.hintLevel) : max),
        0,
      ),
    [messages],
  );

  const attached: AttachedCode | undefined =
    attachCode && code
      ? {
          code: code.code,
          languageId: code.languageId,
          source: code.source,
          cursorLine: code.cursorLine,
          selection: code.selection,
        }
      : undefined;

  const run = useCallback(
    async (start: (signal: AbortSignal, handlers: StreamCallbacks) => Promise<unknown>) => {
      const store = useCoachStore.getState();
      if (store.streamingId) return;
      controller = new AbortController();
      // Batch rendering to animation frames: tokens can arrive faster than React should paint.
      let buffer = '';
      let frame = 0;
      const flush = () => {
        frame = 0;
        useCoachStore.getState().set({ streamingText: buffer });
      };
      try {
        await start(controller.signal, {
          onStart: (id) => useCoachStore.getState().set({ streamingId: id, streamingText: '' }),
          onText: (delta) => {
            buffer += delta;
            frame ||= requestAnimationFrame(flush);
          },
          onReset: () => {
            buffer = '';
            flush();
          },
        });
      } finally {
        cancelAnimationFrame(frame);
        controller = null;
        useCoachStore.getState().set({ streamingId: null, streamingText: '' });
      }
    },
    [],
  );

  const send = useCallback(
    (options: SendOptions) => {
      if (!conversationId) return Promise.resolve();
      const withCode =
        attached ??
        (options.withSelection && code
          ? {
              code: code.code,
              languageId: code.languageId,
              source: code.source,
              selection: code.selection,
            }
          : undefined);
      return run((signal, callbacks) =>
        sendTurn(coachDeps, {
          conversationId,
          problem,
          level: settings.experienceLevel,
          code: withCode,
          signal,
          ...options,
          ...callbacks,
        }),
      );
    },
    [conversationId, attached, code, problem, settings.experienceLevel, run],
  );

  const retry = useCallback(
    (assistantId: string) => {
      if (!conversationId) return Promise.resolve();
      return run((signal, callbacks) =>
        retryTurn(coachDeps, assistantId, {
          conversationId,
          problem,
          level: settings.experienceLevel,
          signal,
          ...callbacks,
        }),
      );
    },
    [conversationId, problem, settings.experienceLevel, run],
  );

  const stop = useCallback(() => controller?.abort(), []);

  const newChat = useCallback(async () => {
    controller?.abort();
    const conversation = await createConversation(db, problem.slug);
    useCoachStore.getState().set({ conversationId: conversation.id });
  }, [problem.slug]);

  return {
    messages: messages ?? [],
    loading: messages === undefined,
    streamingId,
    hintLevel,
    code,
    attached: !!attached,
    send,
    retry,
    stop,
    newChat,
  };
}

interface StreamCallbacks {
  onStart(id: string): void;
  onText(delta: string): void;
  onReset(): void;
}
