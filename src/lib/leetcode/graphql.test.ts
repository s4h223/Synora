import fixture from '../../../tests/fixtures/leetcode/two-sum.graphql.json';
import {
  fetchQuestion,
  LeetCodeApiError,
  normalizeQuestion,
  parseQuestionResponse,
  parseSignature,
  readCsrfToken,
} from './graphql';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('parseQuestionResponse + normalizeQuestion', () => {
  it('normalizes a real response shape', () => {
    const raw = parseQuestionResponse(fixture);
    expect(raw).not.toBeNull();
    const problem = normalizeQuestion(raw!);

    expect(problem).toMatchObject({
      id: '1',
      frontendId: '1',
      slug: 'two-sum',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      difficulty: 'Easy',
      isPaidOnly: false,
      exampleInputs: ['[2,7,11,15]\n9', '[3,2,4]\n6', '[3,3]\n6'],
      tags: [
        { name: 'Array', slug: 'array' },
        { name: 'Hash Table', slug: 'hash-table' },
      ],
      signature: {
        functionName: 'twoSum',
        params: [
          { name: 'nums', type: 'integer[]' },
          { name: 'target', type: 'integer' },
        ],
        returnType: 'integer[]',
      },
      solvedStatus: null,
      source: 'graphql',
    });
    expect(problem.constraints).toHaveLength(3);
    expect(problem.description).toContain('Given an array of integers');
  });

  it('handles premium problems with no content', () => {
    const raw = parseQuestionResponse({
      data: {
        question: {
          ...fixture.data.question,
          isPaidOnly: true,
          content: null,
          metaData: null,
          status: 'ac',
        },
      },
    });
    const problem = normalizeQuestion(raw!);
    expect(problem.isPaidOnly).toBe(true);
    expect(problem.description).toBeNull();
    expect(problem.constraints).toEqual([]);
    expect(problem.signature).toBeNull();
    expect(problem.solvedStatus).toBe('ac');
  });

  it('returns null for an unknown slug', () => {
    expect(parseQuestionResponse({ data: { question: null } })).toBeNull();
  });

  it('throws a schema error on an unexpected shape', () => {
    expect(() => parseQuestionResponse({ data: { question: { title: 42 } } })).toThrow(
      LeetCodeApiError,
    );
  });

  it('surfaces GraphQL errors', () => {
    expect(() =>
      parseQuestionResponse({ data: null, errors: [{ message: 'rate limited' }] }),
    ).toThrow('rate limited');
  });

  it('ignores unknown difficulty values', () => {
    const raw = parseQuestionResponse({
      data: { question: { ...fixture.data.question, difficulty: 'Legendary' } },
    });
    expect(normalizeQuestion(raw!).difficulty).toBeNull();
  });
});

describe('parseSignature', () => {
  it('returns null for design problems and invalid JSON', () => {
    expect(parseSignature('{"classname":"LRUCache","methods":[]}')).toBeNull();
    expect(parseSignature('{not json')).toBeNull();
    expect(parseSignature(null)).toBeNull();
  });
});

describe('fetchQuestion', () => {
  it('posts the query with the CSRF token and parses the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(fixture));
    const problem = await fetchQuestion('two-sum', fetchMock, 'tok');

    expect(problem?.title).toBe('Two Sum');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://leetcode.com/graphql/');
    expect(init.method).toBe('POST');
    expect(init.headers['x-csrftoken']).toBe('tok');
    expect(JSON.parse(init.body).variables).toEqual({ titleSlug: 'two-sum' });
  });

  it('omits the CSRF header when there is no token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(fixture));
    await fetchQuestion('two-sum', fetchMock);
    expect(fetchMock.mock.calls[0]![1].headers).not.toHaveProperty('x-csrftoken');
  });

  it('throws an http error on non-2xx responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 429));
    await expect(fetchQuestion('two-sum', fetchMock)).rejects.toMatchObject({ kind: 'http' });
  });

  it('throws a network error when fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchQuestion('two-sum', fetchMock)).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('readCsrfToken', () => {
  it('reads the csrftoken cookie', () => {
    expect(readCsrfToken('a=1; csrftoken=abc%3D; b=2')).toBe('abc=');
    expect(readCsrfToken('csrftoken=xyz')).toBe('xyz');
    expect(readCsrfToken('a=1')).toBeNull();
  });
});
