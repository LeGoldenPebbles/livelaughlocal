/**
 * Do our R2 credentials actually work, locally and on the live service?
 *
 *   node scripts/check-r2.mjs            # test the pair in .env.local
 *   node scripts/check-r2.mjs --render   # test .env.local AND the pair on Render
 *
 * Read-only against R2: it lists a single object, nothing more.
 *
 * WHY: hero images are uploaded to R2 both by scripts/publish-batch.mjs (using
 * the pair in .env.local) and by the running app when an admin uploads through
 * the dashboard (using the pair in the Render environment). Those are two
 * different copies of the same secret, so rotating the key in one place leaves
 * the other broken - and it breaks silently, because nothing uploads an image
 * until somebody happens to try.
 *
 * Never prints a secret. Key prefixes only, so two environments can be told
 * apart in the output without the value ending up in a terminal log.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const localEnv = {};
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) localEnv[m[1]] = m[2].replace(/^"|"$/g, '');
}

const short = (s) => (s ? `${String(s).slice(0, 8)}...` : '(unset)');

async function test(label, env) {
  const missing = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'].filter((k) => !env[k]);
  if (missing.length) {
    console.log(`${label.padEnd(10)} SKIP  missing ${missing.join(', ')}`);
    return null;
  }
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
  try {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: env.R2_BUCKET, MaxKeys: 1 }));
    console.log(`${label.padEnd(10)} OK    key ${short(env.R2_ACCESS_KEY_ID)} can read bucket "${env.R2_BUCKET}" (${res.KeyCount ?? 0} object sampled)`);
    return true;
  } catch (err) {
    console.log(`${label.padEnd(10)} FAIL  key ${short(env.R2_ACCESS_KEY_ID)} -> ${err.name}: ${String(err.message).slice(0, 90)}`);
    return false;
  }
}

console.log('R2 credential check\n');
const localOk = await test('local', localEnv);

if (process.argv.includes('--render')) {
  const key = localEnv.RENDER_API_KEY;
  const svc = localEnv.RENDER_SERVICE_ID;
  if (!key || !svc) {
    console.log('render     SKIP  RENDER_API_KEY / RENDER_SERVICE_ID not in .env.local');
  } else {
    const res = await fetch(`https://api.render.com/v1/services/${svc}/env-vars?limit=100`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const rows = await res.json();
    const renderEnv = {};
    for (const it of rows) {
      const e = it.envVar || it;
      renderEnv[e.key] = e.value;
    }
    const renderOk = await test('render', renderEnv);

    const drifted = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_PUBLIC_HOST']
      .filter((k) => localEnv[k] !== renderEnv[k]);
    console.log();
    if (!drifted.length) {
      console.log('the two environments hold the same R2 settings');
    } else {
      console.log(`DRIFT: ${drifted.join(', ')} differ between .env.local and Render`);
      if (localOk && renderOk === false) {
        console.log('  local works and Render does not: Render is holding a revoked key, sync it.');
      } else if (localOk && renderOk) {
        console.log('  both work: two live keys against the same bucket. Harmless, but pick one.');
      } else if (localOk === false) {
        console.log('  the LOCAL key is the broken one. Do NOT copy it to Render.');
      }
    }
  }
}
