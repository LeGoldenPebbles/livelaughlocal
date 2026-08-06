/**
 * Is the service about to be OOM-killed again, and who is driving it?
 *
 *   node scripts/check-memory.mjs           # memory trend + recent OOMs
 *   node scripts/check-memory.mjs --who     # also: who is hitting us right now
 *
 * Read-only.
 *
 * WHY: the container is 512MB and Node cannot see that. V8 sizes its heap from
 * the HOST, never feels pressure, and the container kills it first. The service
 * has been OOM-killed on 26 and 28 July and again on 4 and 6 August 2026.
 *
 * The thing to look for is a STAIRCASE: memory stepping up and holding rather
 * than sawtoothing. A healthy Next server rises and falls. This one climbs to a
 * plateau and stays there until it hits the ceiling.
 *
 * IMPORTANT, and the reason --who exists: NODE_OPTIONS=--max-old-space-size
 * bounds V8's old space ONLY. On 6 August RSS peaked at 460MB against a 300MB
 * cap, so roughly 160MB was outside the JS heap entirely, in sharp's native
 * buffers inside the image optimiser. That flag cannot see that memory, so a
 * heap cap alone will never make this safe. Controlling who reaches the origin
 * is what actually works.
 *
 * Render keeps logs for about an hour, so --who is only useful DURING or just
 * after an incident.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const KEY = process.env.RENDER_API_KEY;
const SVC = process.env.RENDER_SERVICE_ID;
const WHO = process.argv.includes('--who');
const SELFTEST = process.argv.includes('--selftest');
const LIMIT_MB = 512;

/**
 * Is this series a leak, or a service doing its job?
 *
 * A STAIRCASE is memory that climbs and never gives any back. That is what
 * preceded every kill here: 114MB to 511MB over sixteen hours on 28 July.
 *
 * Two things look exactly like a staircase and are not, and BOTH have produced
 * a false alarm from this script already:
 *
 *  1. A restart in the middle of the window. Memory drops to near zero and
 *     climbs back to a normal working set. Handled by measuring only since the
 *     last big drop - that was the first fix.
 *  2. A restart at the EDGE of the window. There is no drop to find, because
 *     the fall happened before the first data point, so the whole six hours
 *     read as one long climb. This called a perfectly healthy service a
 *     staircase on 6 August with memory sitting flat at 174MB, hours after the
 *     deploy that restarted it.
 *
 * The fix for both is to judge the RECENT HALF of the segment rather than all
 * of it. A boot ramp is finished by then, so the recent half is flat. A leak is
 * still climbing in the recent half, because that is what a leak does.
 *
 * The threshold is a RATE, not a total, so it does not depend on how long the
 * window happens to be. 15MB/hour sustained eats the whole 512MB container
 * inside a day; the real 28 July staircase ran at about 25MB/hour.
 *
 * Exported shape so --selftest can feed it known-good and known-bad series.
 * Nothing in this repo gets trusted until it has been shown to fail correctly.
 */
export function describeShape(points) {
  if (points.length < 4) return { verdict: 'unknown', note: 'not enough data points' };

  // Only judge since the last restart. A drop of more than 40 per cent between
  // consecutive readings is a process dying, not a garbage collection.
  let start = 0;
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].v < points[i - 1].v * 0.6) start = i;
  }
  const seg = points.slice(start);
  // A first reading below any plausible Next.js working set means the window
  // opens mid-boot even though no drop is visible.
  const restartedAt = start > 0 ? points[start].t : seg[0].v < 60 ? seg[0].t : null;
  const spanMin = Math.round((seg[seg.length - 1].ms - seg[0].ms) / 60000);

  if (spanMin < 90) {
    return {
      verdict: 'unknown',
      restartedAt,
      spanMin,
      note: 'too soon to say - a working set climbs for the first hour after a restart',
    };
  }

  const half = seg.slice(Math.floor(seg.length / 2));
  const halfMin = Math.max(1, (half[half.length - 1].ms - half[0].ms) / 60000);
  const climb = half[half.length - 1].v - half[0].v;
  const perHour = (climb / halfMin) * 60;
  // A fall means memory was actually released. Small wobbles are not falls.
  const falls = half.filter((p, i) => i && p.v < half[i - 1].v - 15).length;

  if (perHour > 15 && falls <= 1) {
    return { verdict: 'staircase', restartedAt, spanMin, perHour: Math.round(perHour) };
  }
  return { verdict: 'healthy', restartedAt, spanMin, perHour: Math.round(perHour) };
}

if (SELFTEST) {
  // Synthetic series, all sampled every 4 minutes like the real API.
  const base = 1754500000000;
  const build = (vals) => vals.map((v, i) => ({ ms: base + i * 4 * 60000, t: `t${i}`, v }));
  const ramp = (from, to, n) => Array.from({ length: n }, (_, i) => Math.round(from + ((to - from) * i) / (n - 1)));
  const wobble = (mid, n) => Array.from({ length: n }, (_, i) => mid + [0, 9, -6, 4, -8, 7, -3][i % 7]);

  const cases = [
    // The 6 August false positive: boot at the window edge, then a flat plateau.
    ['boot ramp then plateau (6 Aug real data)', build([3, ...ramp(143, 180, 12), ...wobble(174, 30)]), 'healthy'],
    // The 28 July kill: a genuine sixteen-hour climb, six hours of it.
    ['real staircase, ~25MB/hour', build(ramp(240, 390, 90)), 'staircase'],
    // A leak that only starts halfway through must still be caught.
    ['flat then leaking', build([...wobble(150, 45), ...ramp(150, 300, 45)]), 'staircase'],
    // Healthy services rise and fall.
    ['sawtooth working set', build(wobble(200, 90)), 'healthy'],
    // Restart in the middle, then a normal working set.
    ['restart mid-window', build([...wobble(300, 40), 4, ...ramp(60, 175, 20), ...wobble(175, 30)]), 'healthy'],
    // Not enough elapsed time to judge anything.
    ['only one hour of data', build(ramp(60, 200, 15)), 'unknown'],
  ];

  let bad = 0;
  console.log('shape detection self-test\n');
  for (const [name, pts, want] of cases) {
    const got = describeShape(pts).verdict;
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${String(got).padEnd(10)} (want ${String(want).padEnd(10)}) ${name}`);
  }
  console.log(`\n${bad ? `${bad} case(s) wrong - do not trust this script` : 'all cases correct'}`);
  process.exit(bad ? 1 : 0);
}

const api = async (p, params = {}) => {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`https://api.render.com${p}${q ? `?${q}` : ''}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  return res.json();
};

const iso = (d) => new Date(d).toISOString().replace(/\.\d{3}Z$/, 'Z');
const now = Date.now();

// ---- memory ---------------------------------------------------------------
const mem = await api('/v1/metrics/memory', {
  resource: SVC,
  startTime: iso(now - 6 * 60 * 60 * 1000),
  endTime: iso(now),
});
const series = Array.isArray(mem) ? mem[0] : mem;
const pts = (series && (series.values || series.data)) || [];
const mb = (v) => Math.round(v / 1048576);

if (!pts.length) {
  console.log('no memory points returned');
} else {
  // Keep the real timestamp: the API returns a point every few minutes, not
  // every minute, so counting array entries as minutes understates the elapsed
  // window by a factor of four and makes the "too soon to say" guard useless.
  const a = pts
    .map((p) => {
      const raw = String(p.timestamp || p.time || '');
      return { ms: Date.parse(raw), t: raw.slice(11, 16), v: mb(p.value) };
    })
    .filter((p) => Number.isFinite(p.ms));
  const step = Math.max(1, Math.floor(a.length / 20));
  console.log(`memory, last 6 hours (limit ${LIMIT_MB}MB)\n`);
  for (let i = 0; i < a.length; i += step) {
    const p = a[i];
    const pct = p.v / LIMIT_MB;
    const mark = pct > 0.85 ? '  <-- DANGER' : pct > 0.7 ? '  <-- high' : '';
    console.log(`  ${p.t}  ${String(p.v).padStart(4)}MB ${'#'.repeat(Math.round(pct * 38))}${mark}`);
  }
  const cur = a[a.length - 1];
  const peak = Math.max(...a.map((x) => x.v));
  const first = a[0].v;
  console.log(`\n  now ${cur.v}MB (${Math.round((cur.v / LIMIT_MB) * 100)}%)  peak ${peak}MB  6h ago ${first}MB`);
  const shape = describeShape(a);
  if (shape.restartedAt) {
    console.log(`  (restarted around ${shape.restartedAt}; shape measured over the ${shape.spanMin} minutes since)`);
  }
  if (shape.verdict === 'unknown') {
    console.log(`  SHAPE: too soon to say. ${shape.note}.`);
  } else if (shape.verdict === 'staircase') {
    console.log(`  SHAPE: staircase. Climbing ${shape.perHour}MB/hour and not releasing - this is how the kills looked.`);
    console.log('         Run with --who. Last time it was one crawler taking 94% of traffic.');
  } else {
    console.log(`  SHAPE: healthy. Settled, drifting ${shape.perHour >= 0 ? '+' : ''}${shape.perHour}MB/hour over the recent half.`);
  }
  if (cur.v / LIMIT_MB > 0.85) {
    console.log('  CEILING: above 85% of the container limit right now, whatever the shape is doing.');
  }
}

// ---- recent kills ---------------------------------------------------------
const events = await api(`/v1/services/${SVC}/events`, { limit: '30' });
const kills = (events || [])
  .map((it) => it.event || it)
  .filter((e) => JSON.stringify(e.details || {}).includes('oomKilled'));
console.log(`\nOOM kills in recent history: ${kills.length}`);
for (const k of kills.slice(0, 6)) console.log(`  ${String(k.timestamp).slice(0, 19).replace('T', ' ')}`);

// ---- who is hitting us ----------------------------------------------------
if (WHO) {
  const svc = await api(`/v1/services/${SVC}`);
  const logs = await api('/v1/logs', {
    ownerId: svc.ownerId,
    resource: SVC,
    startTime: iso(now - 30 * 60 * 1000),
    endTime: iso(now),
    limit: '200',
  });
  if (!logs.logs) {
    console.log('\nno logs available for this window (retention is about an hour)');
  } else {
    const lines = logs.logs.filter((l) => String(l.message).includes('clientIP'));
    const agents = {};
    const prefixes = {};
    const ips = new Set();
    for (const l of lines) {
      const m = String(l.message);
      const ip = (m.match(/clientIP="([^"]+)"/) || [])[1] || '?';
      ips.add(ip);
      // /48 for IPv6, /16 for IPv4 - crawler fleets rotate within a block, so
      // the block is the meaningful unit, not the address.
      const pfx = ip.includes(':') ? ip.split(':').slice(0, 3).join(':') + '::/48' : ip.split('.').slice(0, 2).join('.') + '.0.0/16';
      prefixes[pfx] = (prefixes[pfx] || 0) + 1;
      const ua = (m.match(/userAgent="([^"]*)"/) || [])[1] || '?';
      // Crawlers hide their name at the END of a browser-shaped UA string.
      const named = ua.match(/(meta-externalagent|facebookexternalhit|Googlebot|bingbot|GPTBot|ClaudeBot|Amazonbot|Bytespider|SemrushBot|AhrefsBot|PetalBot|DataForSeoBot|Applebot)/i);
      const key = named ? named[1] : 'unidentified browser UA';
      agents[key] = (agents[key] || 0) + 1;
    }
    console.log(`\nlast 30 min: ${lines.length} request(s) from ${ips.size} distinct IP(s)`);
    console.log('\n  by agent:');
    for (const [k, v] of Object.entries(agents).sort((a, b) => b[1] - a[1])) console.log(`    ${String(v).padStart(4)}  ${k}`);
    console.log('\n  by network block:');
    for (const [k, v] of Object.entries(prefixes).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
      const spread = new Set([...ips].filter((i) => (i.includes(':') ? i.split(':').slice(0, 3).join(':') + '::/48' : i.split('.').slice(0, 2).join('.') + '.0.0/16') === k)).size;
      console.log(`    ${String(v).padStart(4)}  ${k}  across ${spread} address(es)`);
    }
    console.log('\n  A block with many requests spread over many addresses defeats any');
    console.log('  rate limit keyed on ip.src. That is what Meta did on 6 August.');
  }
}
