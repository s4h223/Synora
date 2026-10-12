import { type LangFamily, languageFamily, stripLiteralsAndComments } from './language';

/**
 * Curated, offline reference for the built-ins and syntax that appear in
 * LeetCode solutions. Shown instantly in Line Insights, with no AI and no cost.
 * Keep entries short, accurate, and focused on what trips learners up.
 */
export interface GlossaryEntry {
  id: string;
  family: LangFamily | 'all';
  title: string;
  summary: string;
  example?: string;
  cost?: string;
  pitfall?: string;
  /** Identifiers that trigger the entry (whole-word match). */
  tokens?: string[];
  /** Method names that trigger the entry when called as `.name(`. */
  methods?: string[];
  /**
   * Custom matcher for syntax that isn't an identifier. Receives the line with
   * strings/comments stripped, and the raw line.
   */
  test?: (code: string, raw: string) => boolean;
}

const ENTRIES: GlossaryEntry[] = [
  // ── Shared LeetCode types ──────────────────────────────────────────
  {
    id: 'listnode',
    family: 'all',
    tokens: ['ListNode'],
    title: 'ListNode (linked list)',
    summary:
      'LeetCode’s linked-list node. Each node has a value (`val`) and a pointer to the next node (`next`); the last node’s `next` is empty (None/null).',
    pitfall: 'Check a node is not empty before reading `.next` or `.val`.',
  },
  {
    id: 'treenode',
    family: 'all',
    tokens: ['TreeNode'],
    title: 'TreeNode (binary tree)',
    summary:
      'LeetCode’s binary tree node with `val`, `left` and `right`. Missing children are empty (None/null), which is usually the base case in recursion.',
  },

  // ── Python ─────────────────────────────────────────────────────────
  {
    id: 'py-self',
    family: 'python',
    tokens: ['self'],
    title: 'self',
    summary:
      'The object the method belongs to. LeetCode solutions are methods of `class Solution`, so they take `self` first; you never pass it yourself.',
  },
  {
    id: 'py-def',
    family: 'python',
    tokens: ['def'],
    title: 'def',
    summary: 'Defines a function. The indented block below it is the function body.',
  },
  {
    id: 'py-typing',
    family: 'python',
    tokens: ['List', 'Optional', 'Dict'],
    title: 'Type hints',
    summary:
      '`List[int]`, `Optional[TreeNode]` etc. describe what a value should be. Python does not enforce them; LeetCode imports them for you.',
  },
  {
    id: 'py-return',
    family: 'python',
    tokens: ['return'],
    title: 'return',
    summary: 'Ends the function immediately and hands the value back to the caller.',
  },
  {
    id: 'py-for',
    family: 'python',
    test: (c) => /\bfor\b.+\bin\b/.test(c),
    title: 'for … in',
    summary: 'Runs the indented block once for each item, assigning the item to the loop variable.',
    example: 'for x in nums:\n    total += x',
  },
  {
    id: 'py-in',
    family: 'python',
    test: (c) => /\bin\b/.test(c) && !/\bfor\b/.test(c),
    title: 'x in container',
    summary: 'Checks membership and gives True or False.',
    cost: 'O(1) on average for set and dict; O(n) for list and string (it scans).',
  },
  {
    id: 'py-while',
    family: 'python',
    tokens: ['while'],
    title: 'while',
    summary: 'Repeats the block while the condition is true.',
    pitfall:
      'Something inside the loop must eventually make the condition false, or it never ends.',
  },
  {
    id: 'py-enumerate',
    family: 'python',
    tokens: ['enumerate'],
    title: 'enumerate',
    summary: 'Loops over items together with their index.',
    example: 'for i, x in enumerate(["a", "b"]):\n    # i=0, x="a"  then  i=1, x="b"',
  },
  {
    id: 'py-range',
    family: 'python',
    tokens: ['range'],
    title: 'range',
    summary: 'Counts from start up to, but not including, stop.',
    example: 'range(3)      # 0, 1, 2\nrange(1, 4)   # 1, 2, 3\nrange(5, 0, -1)  # 5, 4, 3, 2, 1',
    pitfall: 'The stop value is excluded, a classic off-by-one source.',
  },
  {
    id: 'py-len',
    family: 'python',
    tokens: ['len'],
    title: 'len',
    summary: 'Number of items in a list, string, dict or set.',
    cost: 'O(1)',
  },
  {
    id: 'py-dict',
    family: 'python',
    tokens: ['dict'],
    test: (c) => /=\s*\{\s*\}/.test(c),
    title: 'dict (hash map)',
    summary: 'Maps keys to values, e.g. a number to the index where you saw it.',
    example: 'seen = {}\nseen[7] = 0\nif 7 in seen: ...',
    cost: 'Lookup, insert and `key in d` are O(1) on average.',
    pitfall:
      'Reading a missing key with d[k] raises KeyError. Use d.get(k, default) or check `k in d`.',
  },
  {
    id: 'py-get',
    family: 'python',
    methods: ['get'],
    title: 'dict.get',
    summary:
      '`d.get(key, default)` returns the value, or `default` if the key is missing (no error).',
  },
  {
    id: 'py-defaultdict',
    family: 'python',
    tokens: ['defaultdict'],
    title: 'defaultdict',
    summary:
      'A dict that creates missing keys automatically: `defaultdict(int)` starts at 0, `defaultdict(list)` starts with [].',
    example: 'count = defaultdict(int)\ncount["a"] += 1  # no KeyError',
  },
  {
    id: 'py-counter',
    family: 'python',
    tokens: ['Counter'],
    title: 'Counter',
    summary: 'Counts how many times each item appears.',
    example: 'Counter("aab")  # {"a": 2, "b": 1}',
    cost: 'O(n) to build.',
  },
  {
    id: 'py-set',
    family: 'python',
    tokens: ['set'],
    title: 'set',
    summary: 'Unordered collection of unique items.',
    cost: '`x in s`, add and remove are O(1) on average.',
    pitfall: '`{}` is an empty dict, not a set. Use `set()`.',
  },
  {
    id: 'py-append',
    family: 'python',
    methods: ['append'],
    title: 'list.append',
    summary: 'Adds one item to the end of a list.',
    cost: 'O(1) amortized.',
  },
  {
    id: 'py-pop',
    family: 'python',
    methods: ['pop'],
    title: 'list.pop',
    summary: '`.pop()` removes and returns the last item. `.pop(i)` removes index i.',
    cost: '`.pop()` is O(1); `.pop(0)` is O(n) because every item shifts.',
    pitfall: 'For a queue, use collections.deque and popleft() instead of pop(0).',
  },
  {
    id: 'py-deque',
    family: 'python',
    tokens: ['deque', 'popleft', 'appendleft'],
    title: 'deque',
    summary: 'Double-ended queue: add or remove at both ends quickly. The standard queue for BFS.',
    cost: 'append, appendleft, pop, popleft are all O(1).',
  },
  {
    id: 'py-heapq',
    family: 'python',
    tokens: ['heapq', 'heappush', 'heappop', 'heapify'],
    title: 'heapq (min-heap)',
    summary: 'Keeps a list arranged so `heap[0]` is always the smallest item.',
    cost: 'heappush / heappop O(log n); heapify O(n).',
    pitfall: 'There is no max-heap: push negated values (-x) and negate when popping.',
  },
  {
    id: 'py-sorted',
    family: 'python',
    tokens: ['sorted'],
    title: 'sorted',
    summary:
      'Returns a new sorted list; the original is unchanged. `key=` sorts by a computed value.',
    example: 'sorted(words, key=len)',
    cost: 'O(n log n)',
  },
  {
    id: 'py-sort',
    family: 'python',
    methods: ['sort'],
    title: 'list.sort',
    summary: 'Sorts the list in place.',
    cost: 'O(n log n)',
    pitfall: 'It returns None, so `x = nums.sort()` sets x to None.',
  },
  {
    id: 'py-zip',
    family: 'python',
    tokens: ['zip'],
    title: 'zip',
    summary: 'Walks several sequences side by side, stopping at the shortest.',
    example: 'for a, b in zip(xs, ys): ...',
  },
  {
    id: 'py-minmax',
    family: 'python',
    tokens: ['min', 'max'],
    title: 'min / max',
    summary:
      'With one iterable, the smallest/largest item (O(n)). With two values, the smaller/larger of them.',
  },
  {
    id: 'py-inf',
    family: 'python',
    test: (c, raw) => /float\(\s*['"][+-]?inf/.test(raw) || /\bmath\.inf\b/.test(c),
    title: "float('inf')",
    summary: 'Infinity. A handy starting value when tracking a minimum (or -inf for a maximum).',
  },
  {
    id: 'py-floordiv',
    family: 'python',
    test: (c) => c.includes('//'),
    title: '// (floor division)',
    summary: 'Divides and rounds down: 7 // 2 == 3.',
    pitfall: 'It rounds toward negative infinity: -7 // 2 == -4 (Java and C++ give -3).',
  },
  {
    id: 'py-mod',
    family: 'python',
    test: (c) => /[\w)\]]\s*%\s*[\w(]/.test(c),
    title: '% (remainder)',
    summary:
      'Remainder after division: 7 % 3 == 1. Often used for even/odd checks and wrap-around.',
    pitfall: 'In Python the result takes the sign of the divisor: -7 % 3 == 2.',
  },
  {
    id: 'py-slice',
    family: 'python',
    test: (c) => /\[[^\]\n]*:[^\]\n]*\]/.test(c) && !/\[\s*\w+\s*:\s*\w+\s*\]\s*=/.test(c),
    title: 'Slicing a[i:j]',
    summary: 'Copies items i through j-1 into a new list or string. `a[::-1]` is a reversed copy.',
    cost: 'O(j - i): it copies, so slicing inside a loop can make code quadratic.',
  },
  {
    id: 'py-bisect',
    family: 'python',
    tokens: ['bisect', 'bisect_left', 'bisect_right'],
    title: 'bisect',
    summary:
      'Binary search on a sorted list: `bisect_left(a, x)` is the first index where x could be inserted.',
    cost: 'O(log n)',
  },
  {
    id: 'py-none',
    family: 'python',
    tokens: ['None'],
    title: 'None',
    summary: 'Python’s “no value”. Check for it with `is None` / `is not None`.',
  },
  {
    id: 'py-nonlocal',
    family: 'python',
    tokens: ['nonlocal'],
    title: 'nonlocal',
    summary:
      'Lets a nested function reassign a variable from the enclosing function (common in recursive helpers).',
  },

  // ── Java ───────────────────────────────────────────────────────────
  {
    id: 'java-hashmap',
    family: 'java',
    tokens: ['HashMap', 'Map'],
    title: 'HashMap',
    summary: 'Maps keys to values.',
    cost: 'get, put and containsKey are O(1) on average.',
    pitfall: '`get` returns null for a missing key. Use `getOrDefault(key, 0)` for counters.',
  },
  {
    id: 'java-getordefault',
    family: 'java',
    methods: ['getOrDefault'],
    title: 'getOrDefault',
    summary: 'Returns the value for a key, or the default you pass when the key is missing.',
    example: 'count.put(c, count.getOrDefault(c, 0) + 1);',
  },
  {
    id: 'java-hashset',
    family: 'java',
    tokens: ['HashSet', 'Set'],
    title: 'HashSet',
    summary: 'Collection of unique items.',
    cost: 'add, remove and contains are O(1) on average. `add` returns false if the item was already there.',
  },
  {
    id: 'java-arraylist',
    family: 'java',
    tokens: ['ArrayList', 'List'],
    title: 'ArrayList',
    summary: 'Resizable array.',
    cost: 'add (at end) amortized O(1), get(i) O(1), remove(i) O(n).',
  },
  {
    id: 'java-length',
    family: 'java',
    test: (c) => /\.length\b(?!\s*\()|\.length\(\)|\.size\(\)/.test(c),
    title: 'length vs length() vs size()',
    summary:
      'Arrays use `.length` (no parentheses), Strings use `.length()`, collections use `.size()`.',
  },
  {
    id: 'java-arrays',
    family: 'java',
    tokens: ['Arrays'],
    title: 'Arrays utilities',
    summary:
      '`Arrays.sort(a)` sorts (O(n log n)), `Arrays.fill(a, v)` fills, `Arrays.toString(a)` prints nicely.',
  },
  {
    id: 'java-equals',
    family: 'java',
    methods: ['equals'],
    title: 'equals',
    summary:
      'Compares contents. For Strings and boxed numbers (Integer), use `a.equals(b)`; `==` checks if they are the same object.',
  },
  {
    id: 'java-intrange',
    family: 'java',
    tokens: ['MAX_VALUE', 'MIN_VALUE', 'long'],
    title: 'int range and long',
    summary:
      '`int` holds about ±2.1 billion (2³¹−1). Larger results overflow silently; use `long`.',
  },
  {
    id: 'java-sb',
    family: 'java',
    tokens: ['StringBuilder'],
    title: 'StringBuilder',
    summary: 'Builds a string piece by piece efficiently; finish with `.toString()`.',
    cost: 'append is amortized O(1). Using `+=` on Strings in a loop is O(n²).',
  },
  {
    id: 'java-charat',
    family: 'java',
    methods: ['charAt'],
    title: 'charAt',
    summary:
      "`s.charAt(i)` is the character at i. Chars are numbers: `c - 'a'` gives 0–25 for lowercase letters.",
  },
  {
    id: 'java-deque',
    family: 'java',
    tokens: ['ArrayDeque', 'Deque', 'Queue', 'Stack'],
    title: 'ArrayDeque (stack / queue)',
    summary:
      'Use as a stack (push, pop, peek) or a queue (offer, poll, peek). Preferred over the old Stack class.',
    cost: 'All operations O(1).',
  },
  {
    id: 'java-pq',
    family: 'java',
    tokens: ['PriorityQueue'],
    title: 'PriorityQueue',
    summary:
      'Min-heap by default: `peek()` is the smallest. Max-heap: `new PriorityQueue<>(Collections.reverseOrder())`.',
    cost: 'offer / poll O(log n), peek O(1).',
  },

  // ── C++ ────────────────────────────────────────────────────────────
  {
    id: 'cpp-vector',
    family: 'cpp',
    tokens: ['vector'],
    title: 'vector',
    summary: 'Resizable array.',
    cost: 'push_back amortized O(1), v[i] O(1), size() O(1).',
    pitfall: '`v[i]` doesn’t check bounds: reading past the end is undefined behavior.',
  },
  {
    id: 'cpp-umap',
    family: 'cpp',
    tokens: ['unordered_map'],
    title: 'unordered_map',
    summary: 'Hash map.',
    cost: 'Lookup and insert are O(1) on average.',
    pitfall:
      '`m[key]` inserts a default value if the key is missing. Use `m.count(key)` or `m.find(key)` just to check.',
  },
  {
    id: 'cpp-uset',
    family: 'cpp',
    tokens: ['unordered_set'],
    title: 'unordered_set',
    summary: 'Hash set of unique items.',
    cost: 'insert, erase, count are O(1) on average.',
  },
  {
    id: 'cpp-map',
    family: 'cpp',
    tokens: ['map', 'set'],
    title: 'map / set (ordered)',
    summary: 'Balanced-tree containers that keep keys sorted.',
    cost: 'O(log n) per operation.',
  },
  {
    id: 'cpp-sort',
    family: 'cpp',
    tokens: ['sort'],
    title: 'sort',
    summary: '`sort(v.begin(), v.end())` sorts ascending. Pass a comparator for custom order.',
    cost: 'O(n log n)',
  },
  {
    id: 'cpp-auto',
    family: 'cpp',
    tokens: ['auto'],
    title: 'auto',
    summary: 'The compiler figures out the type.',
    pitfall:
      'In range loops, `for (auto x : v)` copies each element; use `auto&` (or `const auto&`) to avoid copies or to modify.',
  },
  {
    id: 'cpp-longlong',
    family: 'cpp',
    test: (c) => /\blong\s+long\b|\bINT_MAX\b|\bINT_MIN\b/.test(c),
    title: 'int limits and long long',
    summary:
      '`int` holds about ±2.1 billion (INT_MAX). Use `long long` when sums or products can be larger.',
  },
  {
    id: 'cpp-pq',
    family: 'cpp',
    tokens: ['priority_queue'],
    title: 'priority_queue',
    summary:
      'Max-heap by default: `top()` is the largest. Min-heap: `priority_queue<int, vector<int>, greater<int>>`.',
    cost: 'push / pop O(log n), top O(1).',
  },
  {
    id: 'cpp-substr',
    family: 'cpp',
    methods: ['substr'],
    title: 'substr',
    summary: '`s.substr(pos, len)`: the second argument is a length, not an end index.',
    cost: 'O(len): it copies.',
  },
  {
    id: 'cpp-size',
    family: 'cpp',
    methods: ['size'],
    title: 'size()',
    summary: 'Number of elements.',
    pitfall: '`size()` is unsigned: `v.size() - 1` becomes a huge number when v is empty.',
  },

  // ── JavaScript / TypeScript ────────────────────────────────────────
  {
    id: 'js-map',
    family: 'javascript',
    tokens: ['Map'],
    title: 'Map',
    summary:
      'Key → value map with `get`, `set`, `has`. Keys can be any type, unlike plain objects.',
    cost: 'O(1) on average.',
  },
  {
    id: 'js-set',
    family: 'javascript',
    tokens: ['Set'],
    title: 'Set',
    summary: 'Collection of unique values with `add`, `has`, `delete`.',
    cost: 'O(1) on average.',
  },
  {
    id: 'js-pushpop',
    family: 'javascript',
    methods: ['push', 'pop', 'shift', 'unshift'],
    title: 'push / pop / shift',
    summary: '`push`/`pop` work at the end of the array; `shift`/`unshift` at the front.',
    cost: 'push and pop are O(1); shift and unshift are O(n).',
  },
  {
    id: 'js-sort',
    family: 'javascript',
    methods: ['sort'],
    title: 'Array.sort',
    summary: 'Sorts in place.',
    pitfall:
      'Without a comparator it sorts as strings: [10, 2, 1].sort() gives [1, 10, 2]. Use `(a, b) => a - b`.',
  },
  {
    id: 'js-floor',
    family: 'javascript',
    tokens: ['floor', 'trunc'],
    title: 'Math.floor / Math.trunc',
    summary:
      'JS has no integer division: use `Math.floor(a / b)` (or `Math.trunc` to round toward zero).',
  },
  {
    id: 'js-strict',
    family: 'javascript',
    test: (c) => c.includes('==='),
    title: '=== (strict equality)',
    summary: 'Compares value and type without conversions. Prefer it over `==`.',
  },
  {
    id: 'js-letconst',
    family: 'javascript',
    tokens: ['let', 'const'],
    title: 'let / const',
    summary:
      '`let` declares a variable you can reassign; `const` one you can’t (the object it holds can still change).',
  },
];

export function glossaryFor(family: LangFamily): GlossaryEntry[] {
  return ENTRIES.filter((e) => e.family === family || e.family === 'all');
}

/**
 * Reference entries relevant to one line, most relevant first: the hovered
 * word, then in order of appearance. Capped so the card stays compact.
 */
export function lookupLine(
  lineText: string,
  languageId: string,
  hoveredWord = '',
  limit = 4,
): GlossaryEntry[] {
  const family = languageFamily(languageId);
  if (family === 'other') return [];
  const code = stripLiteralsAndComments(lineText, family);
  if (!code.trim()) return [];

  const identifiers = [...code.matchAll(/[A-Za-z_]\w*/g)].map((m) => ({
    name: m[0],
    index: m.index ?? 0,
    isMethod:
      code.slice(0, m.index).trimEnd().endsWith('.') &&
      /^\s*\(/.test(code.slice((m.index ?? 0) + m[0].length)),
  }));

  const scored: { entry: GlossaryEntry; position: number }[] = [];
  for (const entry of glossaryFor(family)) {
    let position = Number.POSITIVE_INFINITY;
    for (const id of identifiers) {
      const tokenHit = entry.tokens?.includes(id.name);
      const methodHit = id.isMethod && entry.methods?.includes(id.name);
      if (tokenHit || methodHit) {
        position = id.name === hoveredWord ? -1 : Math.min(position, id.index);
      }
    }
    if (position === Number.POSITIVE_INFINITY && entry.test?.(code, lineText)) {
      position = code.length;
    }
    if (position !== Number.POSITIVE_INFINITY) scored.push({ entry, position });
  }

  return scored
    .sort((a, b) => a.position - b.position)
    .slice(0, limit)
    .map((s) => s.entry);
}
