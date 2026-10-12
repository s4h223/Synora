/**
 * Convert LeetCode's description HTML into compact, readable text for display
 * and AI prompts. Handles the subset of HTML LeetCode actually uses.
 *
 * The output is plain text with light markdown (code spans, fenced examples,
 * list bullets). It never contains HTML, so it is safe to render as text.
 */
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const text = renderChildren(doc.body, false);
  return text
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Extract the bullet list under the "Constraints:" heading, one line per item. */
export function extractConstraints(html: string): string[] {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const heading = Array.from(doc.body.querySelectorAll('strong, b, p')).find((el) =>
    /^\s*constraints\s*:?\s*$/i.test(el.textContent ?? ''),
  );
  if (!heading) return [];

  // The heading is a <strong> inside a <p>; the list is the next <ul> sibling.
  let node: Element | null = heading.closest('p') ?? heading;
  while (node && node.tagName !== 'UL') node = node.nextElementSibling;
  if (!node) return [];

  return Array.from(node.querySelectorAll(':scope > li'))
    .map((li) => normalizeInline(renderChildren(li, false)))
    .filter(Boolean);
}

function normalizeInline(text: string): string {
  return text.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function renderChildren(parent: Node, inPre: boolean): string {
  let out = '';
  for (const child of Array.from(parent.childNodes)) out += renderNode(child, inPre);
  return out;
}

function renderNode(node: Node, inPre: boolean): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    return inPre ? text : text.replace(/[ \t\r\n]+/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case 'sup':
      return `^${renderChildren(el, inPre)}`;
    case 'sub':
      return `_${renderChildren(el, inPre)}`;
    case 'br':
      return '\n';
    case 'img':
      return `[image${el.getAttribute('alt') ? `: ${el.getAttribute('alt')}` : ''}]`;
    case 'pre':
      return `\n\`\`\`\n${renderChildren(el, true).replace(/^\n+|\n+$/g, '')}\n\`\`\`\n\n`;
    case 'code':
      return inPre ? renderChildren(el, true) : `\`${renderChildren(el, false)}\``;
    case 'strong':
    case 'b': {
      const inner = renderChildren(el, inPre);
      return inPre || !inner.trim() ? inner : `**${inner.trim()}** `;
    }
    case 'p':
    case 'div':
      return `\n${renderChildren(el, inPre).trim()}\n\n`;
    case 'ul':
    case 'ol':
      return `\n${renderChildren(el, inPre)}\n`;
    case 'li':
      return `- ${normalizeInline(renderChildren(el, inPre))}\n`;
    case 'script':
    case 'style':
      return '';
    default:
      return renderChildren(el, inPre);
  }
}
