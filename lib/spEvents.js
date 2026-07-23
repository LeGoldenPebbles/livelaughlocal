const BASE = process.env.SP_EVENTS_API || 'https://eventwebsite-rups.onrender.com';
const PUBLIC_SITE = 'https://spacesplease.com';

// Normalised event shape used by whats-on pages, contextual promos and the
// article generator. Grounded in the live public events API (the Render
// backend URL bypasses Cloudflare's AI-bot wall entirely).
function normalise(e) {
  const mainImage =
    (e.images || []).find((i) => i.isMain)?.url || (e.images || [])[0]?.url || null;
  const components = e.venue?.locationData?.components || {};
  return {
    id: e._id,
    title: e.title,
    slug: e.slug,
    url: `${PUBLIC_SITE}/events/${e.slug}`,
    type: e.eventType,
    description: e.publicDescription || e.description || '',
    startDate: e.eventStartDate || null,
    endDate: e.eventEndDate || null,
    isMultiDay: !!e.isMultiDay,
    isUpcoming: !!e.isUpcoming,
    venueName: e.venue?.name || '',
    address: e.venue?.location || '',
    town: components.postal_town || components.administrative_area_level_2 || '',
    lat: e.venue?.lat ?? null,
    lng: e.venue?.lng ?? null,
    image: mainImage,
    openForApplications: !!e.isOpenForApplications,
    expectedFootfall: e.expectedFootfall || null,
  };
}

export async function fetchPublicEvents({ limit = 100 } = {}) {
  try {
    const res = await fetch(`${BASE}/api/events?limit=${limit}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const events = Array.isArray(data) ? data : data.events || [];
    return events
      .filter((e) => (e.status ? e.status === 'published' : e.isPublished))
      .map(normalise);
  } catch {
    return [];
  }
}

export async function fetchUpcomingEvents(opts = {}) {
  const all = await fetchPublicEvents(opts);
  return all
    .filter((e) => e.isUpcoming && e.startDate)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

export async function fetchEventsByIds(ids = []) {
  if (!ids.length) return [];
  const all = await fetchPublicEvents();
  const set = new Set(ids.map(String));
  return all.filter((e) => set.has(String(e.id)));
}

// Group upcoming events by town for programmatic /whats-on/[region] pages.
export async function fetchEventsByRegion() {
  const events = await fetchUpcomingEvents();
  const map = new Map();
  for (const e of events) {
    if (!e.town) continue;
    const key = e.town.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!key) continue;
    if (!map.has(key)) map.set(key, { slug: key, name: e.town, events: [] });
    map.get(key).events.push(e);
  }
  return [...map.values()].sort((a, b) => b.events.length - a.events.length);
}
