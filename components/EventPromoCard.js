import Image from 'next/image';
import { fetchEventsByIds } from '@/lib/spEvents';

function formatDateRange(startDate, endDate) {
  if (!startDate) return '';
  const full = { day: 'numeric', month: 'long', year: 'numeric' };
  const start = new Date(startDate);
  const startText = start.toLocaleDateString('en-GB', full);
  if (!endDate) return startText;
  const end = new Date(endDate);
  if (start.toDateString() === end.toDateString()) return startText;
  return `${start.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  })} - ${end.toLocaleDateString('en-GB', full)}`;
}

function withUtm(url) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}utm_source=livelaughlocal&utm_medium=event_promo`;
}

// Honest, clearly labelled promo for the real Spaces Please event an article
// is grounded in. Renders nothing if the event is no longer public.
export default async function EventPromoCard({ ids }) {
  if (!ids?.length) return null;
  const events = await fetchEventsByIds(ids);
  const event = events[0];
  if (!event) return null;

  const dateRange = formatDateRange(event.startDate, event.endDate);
  const place = [event.venueName, event.town].filter(Boolean).join(', ');

  return (
    <aside className="mt-10 rounded-xl border border-line bg-sage-tint p-4 sm:p-5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-ink-faint">
        From Spaces Please
      </p>
      <div className="mt-3 sm:flex sm:gap-4">
        {event.image && (
          <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden rounded-lg border border-line sm:w-40">
            <Image
              src={event.image}
              alt={event.title}
              fill
              sizes="(max-width: 640px) 100vw, 160px"
              className="object-cover"
            />
          </div>
        )}
        <div className="mt-3 min-w-0 sm:mt-0">
          <h3 className="font-display text-lg leading-snug">{event.title}</h3>
          {dateRange && <p className="mt-1 text-sm text-ink-soft">{dateRange}</p>}
          {place && <p className="mt-0.5 text-sm text-ink-soft">{place}</p>}
          {event.openForApplications && (
            <span className="mt-2 inline-block rounded-full bg-coral px-2.5 py-1 text-xs font-medium text-white">
              Taking stall applications
            </span>
          )}
          <p className="mt-3">
            <a
              href={withUtm(event.url)}
              className="text-sm font-medium text-coral-deep underline decoration-coral/40 underline-offset-2 transition-colors hover:text-coral hover:decoration-coral"
            >
              See the full event on Spaces Please
            </a>
          </p>
        </div>
      </div>
    </aside>
  );
}
