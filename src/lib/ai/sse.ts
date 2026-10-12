export interface SseMessage {
  event?: string;
  data: string;
}

/**
 * Minimal Server-Sent Events reader (WHATWG event-stream format) for
 * OpenAI-compatible streaming responses. Handles chunks split mid-line and
 * CRLF line endings; multi-line `data:` fields are joined with "\n".
 */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseMessage> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event: string | undefined;
  let data: string[] = [];

  const dispatch = (): SseMessage | null => {
    if (!data.length) {
      event = undefined;
      return null;
    }
    const message: SseMessage = { data: data.join('\n') };
    if (event) message.event = event;
    event = undefined;
    data = [];
    return message;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });

      const lines = buffer.split(/\r\n|\r|\n/);
      // The last element is an incomplete line unless the stream has ended.
      buffer = done ? '' : (lines.pop() ?? '');

      for (const line of lines) {
        if (line === '') {
          const message = dispatch();
          if (message) yield message;
          continue;
        }
        if (line.startsWith(':')) continue; // comment / keep-alive
        const colon = line.indexOf(':');
        const field = colon === -1 ? line : line.slice(0, colon);
        let value = colon === -1 ? '' : line.slice(colon + 1);
        if (value.startsWith(' ')) value = value.slice(1);
        if (field === 'data') data.push(value);
        else if (field === 'event') event = value;
      }

      if (done) {
        const message = dispatch();
        if (message) yield message;
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
