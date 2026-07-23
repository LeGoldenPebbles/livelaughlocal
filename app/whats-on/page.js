import Link from 'next/link';
import Image from 'next/image';
import { fetchEventsByRegion, fetchRegionIndex } from '@/lib/spEvents';
import NearMe from '@/components/NearMe';

export const revalidate = 1800;

export const metadata = {
  title: "What's on near you - live local event listings",
  description:
    'Markets, fairs, food events and days out across the UK, built from live listings on Spaces Please and refreshed all the time.',
};

const DATE_OPTS = { day: 'numeric', month: 'short' };

function formatShortDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', DATE_OPTS);
}

function nextDateFor(region) {
  let earliest = null;
  for (const e of region.events) {
    if (!e.startDate) continue;
    const t = new Date(e.startDate).getTime();
    if (Number.isNaN(t)) continue;
    if (earliest === null || t < earliest) earliest = t;
  }
  return earliest === null ? null : new Date(earliest).toISOString();
}

function Thumb({ event }) {
  return (
    <div className="relative aspect-[3/2] overflow-hidden rounded-lg border border-line bg-sage-tint">
      {event.image ? (
        <Image
          src={event.image}
          alt={event.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="font-display text-4xl text-sage">*</span>
        </div>
      )}
    </div>
  );
}

export default async function WhatsOnPage() {
  const [regions, regionIndex] = await Promise.all([
    fetchEventsByRegion(),
    fetchRegionIndex(),
  ]);

  const upSoon = regions
    .flatMap((region) =>
      region.events.map((event) => ({
        event,
        regionSlug: region.slug,
        regionName: region.name,
      }))
    )
    .filter(({ event }) => event.startDate)
    .sort((a, b) => new Date(a.event.startDate) - new Date(b.event.startDate))
    .slice(0, 6);

  return (
    <div>
      <header className="max-w-article">
        <h1 className="font-display text-3xl leading-tight sm:text-4xl">
          What&apos;s on near you
        </h1>
        <p className="mt-3 text-ink-soft">
          Built from live listings on Spaces Please - updated all the time.
        </p>
      </header>

      <div className="mt-6 max-w-2xl">
        <NearMe regions={regionIndex} />
      </div>

      {regions.length === 0 ? (
        <div className="mt-10 max-w-article rounded-xl border border-line bg-white/60 p-8 text-center">
          <span className="font-display text-5xl text-sage">*</span>
          <h2 className="mt-3 font-display text-xl">Nothing listed just now</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            We refresh this page from live event listings throughout the day, and
            right now the diary is between updates. Pop back shortly - new
            markets, fairs and days out appear here as soon as organisers list
            them.
          </p>
        </div>
      ) : (
        <>
          {upSoon.length > 0 && (
            <section className="mt-10" aria-labelledby="up-soon-heading">
              <h2
                id="up-soon-heading"
                className="font-display text-xl sm:text-2xl"
              >
                Up soon
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {upSoon.map(({ event, regionSlug }) => (
                  <Link
                    key={event.id}
                    href={`/whats-on/${regionSlug}`}
                    className="group flex flex-col"
                  >
                    <Thumb event={event} />
                    <h3 className="mt-2 font-display text-sm leading-snug decoration-coral/50 underline-offset-4 line-clamp-2 group-hover:underline">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-xs text-ink-faint">
                      {formatShortDate(event.startDate)}
                      {event.town ? ` · ${event.town}` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-12" aria-labelledby="regions-heading">
            <h2 id="regions-heading" className="font-display text-xl sm:text-2xl">
              Browse by place
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {regions.map((region) => {
                const count = region.events.length;
                const next = nextDateFor(region);
                return (
                  <Link
                    key={region.slug}
                    href={`/whats-on/${region.slug}`}
                    className="group flex flex-col rounded-xl border border-line bg-white/60 p-4 transition-colors hover:border-coral"
                  >
                    <h3 className="font-display text-lg leading-snug group-hover:text-coral-deep">
                      {region.name}
                    </h3>
                    <p className="mt-1 text-sm text-ink-soft">
                      {count} upcoming {count === 1 ? 'event' : 'events'}
                    </p>
                    {next && (
                      <p className="mt-2 text-xs uppercase tracking-wide text-ink-faint">
                        Next: {formatShortDate(next)}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
