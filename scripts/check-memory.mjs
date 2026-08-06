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
const LIMIT_MB = 512;

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
  const a = pts.map((p) => ({ t: String(p.timestamp || p.time || '').slice(11, 16), v: mb(p.value) }));
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
  // A staircase is the signature: climbing without ever falling back.
  const falls = a.filter((p, i) => i && p.v < a[i - 1].v - 15).length;
  if (cur.v > first + 60 && falls <= 2) {
    console.log('  SHAPE: staircase. Climbing and not releasing. This is how the last four kills looked.');
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
