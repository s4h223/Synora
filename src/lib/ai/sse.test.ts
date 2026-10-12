import { streamOf } from '../../../tests/helpers';
import { readSse, type SseMessage } from './sse';

async function collect(chunks: string[]): Promise<SseMessage[]> {
  const out: SseMessage[] = [];
  for await (const message of readSse(streamOf(chunks))) out.push(message);
  return out;
}

describe('readSse', () => {
  it('parses data messages separated by blank lines', async () => {
    expect(await collect(['data: one\n\ndata: two\n\n'])).toEqual([
      { data: 'one' },
      { data: 'two' },
    ]);
  });

  it('reassembles lines split across chunks', async () => {
    expect(await collect(['da', 'ta: {"a"', ':1}\n', '\n'])).toEqual([{ data: '{"a":1}' }]);
  });

  it('handles CRLF, event names, comments and multi-line data', async () => {
    expect(await collect([': keep-alive\r\nevent: delta\r\ndata: a\r\ndata: b\r\n\r\n'])).toEqual([
      { event: 'delta', data: 'a\nb' },
    ]);
  });

  it('flushes a final message without a trailing blank line', async () => {
    expect(await collect(['data: last'])).toEqual([{ data: 'last' }]);
  });

  it('decodes multi-byte characters split across chunks', async () => {
    const bytes = new TextEncoder().encode('data: héllo\n\n');
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes.slice(0, 8));
        c.enqueue(bytes.slice(8));
        c.close();
      },
    });
    const out: SseMessage[] = [];
    for await (const m of readSse(stream)) out.push(m);
    expect(out).toEqual([{ data: 'héllo' }]);
  });
});
