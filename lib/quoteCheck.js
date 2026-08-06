/**
 * Does a quotation actually appear at a source that cites it?
 *
 * Shared by scripts/audit-quotes.mjs (checks what is already published) and
 * scripts/publish-batch.mjs (refuses to publish a quote it cannot find). One
 * implementation on purpose: two copies drift, and the copy that drifts is the
 * one that stops catching things.
 *
 * WHY: on 6 August 2026 a quote attributed to a named CMA executive reached a
 * final draft. The words were nowhere on the CMA's page; they had come from a
 * research summary that paraphrased and then presented the paraphrase as a
 * quotation. Putting invented words in a real person's mouth is the worst
 * error this publication can make, and it was caught by hand, which is luck
 * rather than a control.
 *
 * WHAT IT CANNOT DO: prove a quote is fabricated. A source may be paywalled,
 * rewritten, or hostile to robots. So an unreadable source yields UNCHECKED,
 * never PASS and never FAIL. Only "we read every cited page and the words are
 * not in any of them" is treated as a failure.
 */

/**
 * Reduce text to comparable words.
 *
 * Apostrophes are removed rather than kept as word characters, so a quote
 * written as 'what if' matches a page rendering it as “what if”. Contractions
 * stay consistent because both sides get identical treatment. Keeping them
 * scored a genuine Metropolitan Police statement at 6 matched words out of 64.
 */
export function normaliseText(s) {
  return String(s)
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, ' ')
    .replace(/&#8217;|&#39;|&rsquo;|&#x27;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&pound;|&#163;|£/g, ' gbp ')
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pull readable text out of a PDF.
 *
 * This matters more than it sounds. The best primary sources for local
 * reporting are parish and district council papers, and councils publish
 * committee reports, budgets and pitch-fee schedules as PDFs. Saxilby with
 * Ingleby Parish Council puts its Family Fun Day attendance counts, deficit and
 * trader pricing in exactly that form.
 *
 * Without this, the quote gate strips "HTML tags" from binary, gets noise, and
 * reports a perfectly good council quotation as fabricated - which would train
 * writers away from the most authoritative sources available to them.
 *
 * Returns null if the text cannot be extracted, so the caller reports the
 * source as unreadable (UNCHECKED) rather than guessing.
 */
export async function pdfToText(pdfPath) {
  // Imported lazily so this module stays free of node built-ins unless the PDF
  // path is actually taken. Only scripts ever call it.
  const { execFileSync } = await import('node:child_process');
  const py = [
    'import sys, io',
    // Windows defaults stdout to cp1252, which cannot encode the en dash in
    // "Local Government Act 1972, s145 - Provision of Entertainment". The
    // extraction succeeded and then died on the way out, reporting as "no text
    // in this PDF". Force UTF-8 and never fail on an odd character.
    "sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')",
    'try:',
    '    import fitz',
    '    d = fitz.open(sys.argv[1])',
    '    sys.stdout.write(" ".join(p.get_text() for p in d))',
    'except Exception:',
    '    try:',
    '        from pypdf import PdfReader',
    '        r = PdfReader(sys.argv[1])',
    '        sys.stdout.write(" ".join((p.extract_text() or "") for p in r.pages))',
    '    except Exception:',
    '        sys.exit(1)',
  ].join('\n');
  try {
    const out = execFileSync('python', ['-c', py, pdfPath], {
      encoding: 'utf8',
      maxBuffer: 40 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out && out.trim().length > 50 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Flatten HTML to searchable text.
 *
 * Note what this deliberately does NOT do: strip whole tags. Modern pages often
 * ship their real content inside an attribute as an entity-encoded JSON blob
 * and render it client side. Kickstarter is one - a campaign's own description
 * lives in `biography&quot;:&quot;I'm Artemis...`, inside a tag. Removing
 * `<[^>]+>` deletes attributes along with the tag, so the text vanishes and a
 * genuine quotation gets reported as fabricated.
 *
 * Replacing only the angle brackets keeps attribute values. It also drags in
 * tag and attribute names as noise, which is harmless here: noise cannot
 * manufacture an eight-word verbatim run from a quote that is not present.
 */
export function stripHtml(h) {
  return String(h)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/[<>]/g, ' ')
    // Entity-encoded content, decoded so the words match. Numeric entities in
    // both decimal and hex are common in newspaper CMSes: Great British Life
    // renders every apostrophe as &#x2019;, which left "it&#x2019;s" tokenising
    // as "it x2019 s" and scored a genuine quote at 6 words out of 20.
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, ' ')
    .replace(/&amp;/g, '&')
    // Escaped newlines inside embedded JSON, so words either side stay apart.
    .replace(/\\r\\n|\\n|\\r|\\t/g, ' ');
}

/**
 * Is this enough text to be worth searching, or did we just fetch a challenge
 * page? getwedpro.com answers with HTTP 202 and a 226-byte interstitial, which
 * a naive size check waves through as "page loaded". The checker then finds no
 * quote in it and reports a genuine quotation as fabricated. A source we could
 * not really read must come back as unreadable, not as evidence.
 */
export function isUsableText(t) {
  return typeof t === 'string' && t.replace(/\s+/g, ' ').trim().length >= 600;
}

/** Longest run of consecutive quote words appearing verbatim in haystack. */
export function longestRun(quoteWords, haystack) {
  let best = 0;
  for (let i = 0; i < quoteWords.length; i += 1) {
    if (quoteWords.length - i <= best) break; // cannot beat best from here
    let j = i + best;
    let run = best;
    while (j < quoteWords.length) {
      const phrase = ` ${quoteWords.slice(i, j + 1).join(' ')} `;
      if (haystack.indexOf(phrase) === -1) break;
      run = j - i + 1;
      j += 1;
    }
    if (run > best) best = run;
  }
  return best;
}

// A real quotation lands a long verbatim run. A paraphrase does not.
export const STRONG_RUN = 8;
export const WEAK_RUN = 5;
export const STRONG_RATIO = 0.6;

/**
 * @param {string} quote
 * @param {string[]} urls           every source the article cites
 * @param {(u:string)=>Promise<{ok:boolean,text:string,why:string}>} load
 * @returns {Promise<{verdict:'PASS'|'WEAK'|'FAIL'|'UNCHECKED'|'SKIP',detail:string}>}
 */
export async function checkQuote(quote, urls, load) {
  const words = normaliseText(quote).split(' ').filter(Boolean);
  if (words.length < WEAK_RUN) return { verdict: 'SKIP', detail: 'too short to test' };

  let best = 0;
  let readAny = false;
  const unreadable = [];

  for (const u of urls) {
    const page = await load(u);
    if (!page.ok) { unreadable.push(`${u} (${page.why})`); continue; }
    readAny = true;
    const run = longestRun(words, page.text);
    if (run > best) best = run;
    if (best >= words.length) break;
  }

  if (best >= STRONG_RUN || best / words.length >= STRONG_RATIO) {
    return { verdict: 'PASS', detail: `${best}/${words.length} words matched` };
  }

  // Never accuse a quote whose source we could not read. The remedy for a false
  // accusation is to damage a sound article, which is worse than not checking.
  if (unreadable.length) {
    return {
      verdict: 'UNCHECKED',
      detail:
        `${readAny ? 'not in the sources we could read; ' : ''}` +
        `${unreadable.length} unreachable: ${unreadable.join('; ').slice(0, 140)}`,
    };
  }

  if (best >= WEAK_RUN) return { verdict: 'WEAK', detail: `only ${best}/${words.length} words matched` };
  return { verdict: 'FAIL', detail: `read all ${urls.length} cited source(s); best match ${best}/${words.length} words` };
}
