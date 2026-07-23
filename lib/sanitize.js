import sanitizeHtml from 'sanitize-html';

// The entire allowed universe of article HTML. No fonts, no styles, no divs.
// linkRel: 'nofollow' (submissions), 'sponsored' (paid - becomes
// "sponsored nofollow"), or 'none' (our own generated editorial).
export function sanitizeBody(html, { linkRel = 'nofollow' } = {}) {
  const rel =
    linkRel === 'sponsored' ? 'sponsored nofollow' : linkRel === 'none' ? null : 'nofollow';

  return sanitizeHtml(String(html || ''), {
    allowedTags: [
      'p', 'h2', 'h3', 'strong', 'em', 'a', 'ul', 'ol', 'li',
      'blockquote', 'figure', 'img', 'figcaption', 'br',
    ],
    allowedAttributes: {
      a: ['href', 'rel'],
      img: ['src', 'alt'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    transformTags: {
      b: 'strong',
      i: 'em',
      h1: 'h2',
      h4: 'h3',
      h5: 'h3',
      h6: 'h3',
      a: (tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          href: attribs.href || '#',
          ...(rel ? { rel } : {}),
        },
      }),
    },
    exclusiveFilter: (frame) =>
      ['p', 'h2', 'h3'].includes(frame.tag) && !frame.text.trim() && !frame.mediaChildren,
  });
}

// Split sanitized HTML into top-level blocks for in-article ad injection.
// Safe because the sanitizer guarantees these tags never nest in each other.
export function splitBlocks(html) {
  return String(html || '')
    .split(/(?<=<\/(?:p|h2|h3|ul|ol|blockquote|figure)>)/g)
    .map((s) => s.trim())
    .filter(Boolean);
}
