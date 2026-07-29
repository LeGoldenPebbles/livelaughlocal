/**
 * Live status for the Live Laugh Local Render service.
 *   node scripts/render-status.mjs
 *
 * Reads RENDER_API_KEY from .env.local (gitignored). Prints deploy state,
 * memory against the 512MB limit, and any OOM kills. Never prints the token.
 *
 * Memory note: if this ever climbs a staircase toward 512MB, check that
 * NODE_OPTIONS=--max-old-space-size=300 is still set on the service. Without it
 * V8 sizes its heap from the host machine and the container is killed first.
 */
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const KEY = process.env.RENDER_API_KEY;
const SRV = process.env.RENDER_SERVICE_ID;
if (!KEY || !SRV) { console.error('RENDER_API_KEY / RENDER_SERVICE_ID missing from .env.local'); process.exit(1); }
const api = async (p) => (await fetch(`https://api.render.com/v1${p}`, { headers: { Authorization: `Bearer ${KEY}` } })).json();

const deploys = await api(`/services/${SRV}/deploys?limit=3`);
console.log('DEPLOYS');
for (const it of deploys) {
  const d = it.deploy || it;
  console.log(`  ${d.status.padEnd(16)} ${(d.commit?.id || '').slice(0, 8)}  ${(d.finishedAt || d.createdAt || '').slice(0, 19)}`);
}

const events = await api(`/services/${SRV}/events?limit=30`);
const ooms = events.filter((it) => JSON.stringify(it).includes('oomKilled'));
console.log(`\nOOM KILLS in last 30 events: ${ooms.length}`);
for (const it of ooms) console.log('  ', (it.event || it).timestamp?.slice(0, 19));

const mem = await api(`/metrics/memory?resource=${SRV}`);
const vals = mem?.[0]?.values || [];
if (vals.length) {
  const mbs = vals.map((v) => v.value / 1048576);
  const now = mbs[mbs.length - 1];
  console.log(`\nMEMORY  now ${now.toFixed(0)}MB   hour min ${Math.min(...mbs).toFixed(0)}  max ${Math.max(...mbs).toFixed(0)}  (limit 512)`);
  console.log(`        drift over the hour ${(now - mbs[0] >= 0 ? '+' : '')}${(now - mbs[0]).toFixed(0)}MB`);
  if (now > 450) console.log('        WARNING: approaching the container limit');
}
