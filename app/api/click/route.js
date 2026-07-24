import dbConnect from '@/lib/db';
import ClickStat from '@/models/ClickStat';

// Cookieless outbound-click counter. A reader clicked an external link in an
// article; we count it per destination host per day per source article, so we
// can see whether the discreet Spaces Please links actually get followed.
// Always 204 - a beacon cannot read the response and analytics must not error.
export async function POST(request) {
  try {
    const body = await request.json();

    // Destination host - hostname only, never the full URL with its query.
    let host = '';
    try {
      host = new URL(String(body?.href || '')).hostname.replace(/^www\./, '');
    } catch {
      return new Response(null, { status: 204 });
    }
    if (!host || host.length > 100) return new Response(null, { status: 204 });
    // Only external destinations are interesting.
    if (host.endsWith('livelaughlocal.co.uk') || host === 'localhost') {
      return new Response(null, { status: 204 });
    }

    // Source article path, validated the same way as the pageview beacon.
    let path = typeof body?.path === 'string' ? body.path : '';
    if (!path.startsWith('/') || path.length >= 200) path = '';

    await dbConnect();
    const day = new Date().toISOString().slice(0, 10);
    await ClickStat.updateOne(
      { day, host, path },
      { $inc: { count: 1 } },
      { upsert: true }
    );
  } catch {
    // Swallow everything.
  }
  return new Response(null, { status: 204 });
}
