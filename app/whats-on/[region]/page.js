import { Fragment } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { fetchEventsByRegion } from '@/lib/spEvents';

export const revalidate = 1800;

const UTM = 'utm_source=livelaughlocal&utm_medium=whats_on';
const EXHIBITOR_LINK =
  'https://spacesplease.com/for-exhibitors?utm_source=livelaughlocal&utm_medium=whats_on_footer';

const DATE_OPTS = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', DATE_OPTS);
}

function formatWhen(event) {
  const start = formatDate(event.startDate);
  if (!start) return '';
  if (event.isMultiDay && event.endDate) {
    const end = formatDate(event.endDate);
    if (end && end !== start) return `${start} - ${end}`;
  }
  return start;
}

async function findRegion(slug) {
  const regions = await fetchEventsByRegion();
  return regions.find((r) => r.slug === slug) || null;
}

export async function generateMetadata({ params }) {
  const { region: slug } = await params;
  const region = await findRegion(slug);
  if (!region) return { title: "What's on" };
  return {
    title: `What's on in ${region.name}`,
    description: `Upcoming markets, fairs and events in ${region.name} - dates, venues and stall info.`,
  };
}

function eventJsonLd(events) {
  const items = events.map((e) => {
    const obj = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: e.title,
      url: e.url,
    };
    if (e.startDate) obj.startDate = e.startDate;
    if (e.endDate) obj.endDate = e.endDate;
    if (e.image) obj.image = e.image;
    if (e.venueName || e.address) {
      obj.location = {
        '@type': 'Place',
        ...(e.venueName ? { name: e.venueName } : {}),
        ...(e.address ? { address: e.address } : {}),
      };
    }
    return obj;
  });
  return JSON.stringify(items).replace(/</g, '\\u003c');
}

function EventRow({ event }) {
  const when = formatWhen(event);
  const place = [event.venueName, event.address].filter(Boolean).join(', ');
  return (
    <article className="flex gap-4 rounded-xl border border-line bg-white/60 p-4">
      <div className="relative w-32 shrink-0 self-start overflow-hidden rounded-lg bg-sage-tint aspect-[3/2] sm:w-44">
        {event.image ? (
          <Image
            src={event.image}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 128px, 176px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-display text-4xl text-sage">*</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {event.type && (
            <span className="rounded-full bg-sage-tint px-2.5 py-0.5 text-xs font-medium text-sage">
              {event.type}
            </span>
          )}
          {event.openForApplications && (
            <span className="rounded-full bg-coral px-2.5 py-0.5 text-xs font-medium text-white">
              Taking stall applications
            </span>
          )}
        </div>
        <h2 className="mt-2 font-display text-lg leading-snug sm:text-xl">
          {event.title}
        </h2>
        {when && <p className="mt-1 text-sm text-ink-soft">{when}</p>}
        {place && <p className="mt-1 text-sm text-ink-faint">{place}</p>}
        <a
          href={`${event.url}?${UTM}`}
          className="mt-3 inline-block text-sm font-medium text-coral-deep decoration-coral/50 underline-offset-4 hover:underline"
        >
          Event details →
        </a>
      </div>
    </article>
  );
}

export default async function RegionPage({ params }) {
  const { region: slug } = await params;
  const region = await findRegion(slug);
  if (!region) notFound();

  const count = region.events.length;

  return (
    <div className="max-w-3xl">
      <header>
        <h1 className="font-display text-3xl leading-tight sm:text-4xl">
          What&apos;s on in {region.name}
        </h1>
        <p className="mt-3 text-ink-soft">
          {count} upcoming {count === 1 ? 'event' : 'events'}, straight from live
          listings - dates, venues and stall info in one place.
        </p>
      </header>

      <div className="mt-8 space-y-4">
        {region.events.map((event, i) => (
          <Fragment key={event.id}>
            <EventRow event={event} />
          </Fragment>
        ))}
      </div>

      <aside className="mt-10 rounded-xl border border-line bg-sage-tint p-5">
        <p className="text-sm leading-relaxed text-ink-soft">
          Selling at markets? These listings come from{' '}
          <a
            href={EXHIBITOR_LINK}
            className="font-medium text-coral-deep decoration-coral/50 underline-offset-4 hover:underline"
          >
            Spaces Please
          </a>
          , where organisers take stall applications.
        </p>
      </aside>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: eventJsonLd(region.events) }}
      />
    </div>
  );
}
