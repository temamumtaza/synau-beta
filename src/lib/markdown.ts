/**
 * Safe lightweight Markdown → HTML renderer.
 *
 * Why custom (not a dep): lesson content is AI-generated and persisted from
 * Convex. We render it via dangerouslySetInnerHTML, so we MUST escape all
 * raw HTML first, then apply a curated set of markdown transformations.
 * No raw HTML from the source ever reaches the DOM.
 *
 * Supports: fenced code blocks (```), inline code, headings (#..####),
 * bold/italic, links (http/https/mailto only), unordered + ordered lists,
 * blockquotes, horizontal rules, and paragraph grouping.
 */

const VOID = '';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  // Protocol-relative or root-relative allowed
  if (/^\/[^/]*$/.test(trimmed) || trimmed.startsWith('//')) return trimmed;
  return null;
}

/**
 * Inline formatting applied to a single (already-escaped) line of text:
 * inline code, bold, italic, links. Order matters — code first to protect
 * its contents from further transformation.
 */
function renderInline(escaped: string): string {
  let out = escaped;

  // Inline code: `...`  (protect contents from bold/italic/link parsing)
  const codeStash: string[] = [];
  out = out.replace(/`([^`\n]+?)`/g, (_m, code: string) => {
    codeStash.push(code);
    return `\u0000CODE${codeStash.length - 1}\u0000`;
  });

  // Bold: **text** or __text__
  out = out.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_  (avoid matching ** already consumed above)
  out = out.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  out = out.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, '$1<em>$2</em>');

  // Links: [text](url) — URL must pass safeUrl, else render as plain text
  out = out.replace(/\[([^\]]+?)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
    const safe = safeUrl(url);
    if (!safe) return text;
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  // Restore inline code
  out = out.replace(/\u0000CODE(\d+)\u0000/g, (_m, i: string) => {
    return `<code>${codeStash[Number(i)]}</code>`;
  });

  return out;
}

/** Inline-content only (for table cells, list items) — no nested blocks. */
export function renderMarkdownInline(src: string): string {
  return renderInline(escapeHtml(src));
}

/**
 * Full block-level Markdown → HTML.
 * Input is raw (untrusted) markdown. Output is safe HTML.
 */
export function renderMarkdown(src: string): string {
  if (!src) return VOID;
  const input = escapeHtml(src.replace(/\r\n/g, '\n'));

  const lines = input.split('\n');
  const html: string[] = [];

  // Block parsers are state machines grouped by contiguous lines.
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block: ```lang ... ```
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || '';
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // consume closing fence (if any)
      const langAttr = lang ? ` data-lang="${lang}"` : '';
      html.push(
        `<pre class="md-pre"><code class="md-code"${langAttr}>${code.join('\n')}</code></pre>`
      );
      continue;
    }

    // Blank line — paragraph separator
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\1\1[-*_\s]*$/.test(line)) {
      html.push('<hr />');
      i++;
      continue;
    }

    // Heading: # .. ######
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      html.push(`<h${level} class="md-h${level}">${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote: consecutive lines starting with '>'
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      html.push(`<blockquote class="md-quote">${renderInline(quote.join(' '))}</blockquote>`);
      continue;
    }

    // Unordered list: lines starting with -, *, +
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\s*[-*+]\s+/, ''))}</li>`);
        i++;
      }
      html.push(`<ul class="md-ul">${items.join('')}</ul>`);
      continue;
    }

    // Ordered list: lines starting with N.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
        i++;
      }
      html.push(`<ol class="md-ol">${items.join('')}</ol>`);
      continue;
    }

    // Paragraph: gather contiguous non-blank, non-special lines.
    const para: string[] = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*([-*_])\1\1[-*_\s]*$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length > 0) {
      html.push(`<p class="md-p">${renderInline(para.join(' '))}</p>`);
    }
  }

  return html.join('\n');
}
