'use client';

import { useCallback, useEffect, useState } from 'react';

const TABS = [
  { id: 'pending', label: 'Pending', status: 'pending' },
  { id: 'draft', label: 'Drafts', status: 'draft' },
  { id: 'published', label: 'Published', status: 'published' },
  { id: 'rejected', label: 'Rejected', status: 'rejected' },
  { id: 'removed', label: 'Removed', status: 'removed' },
  { id: 'removals', label: 'Removal requests', status: null },
];

const DONE_LABELS = {
  publish: 'Published',
  reject: 'Rejected',
  unpublish: 'Unpublished',
  remove: 'Removed',
  'feature-off': 'Featured switched off for',
};

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'border border-line bg-paper text-ink-faint',
    coral: 'bg-coral-tint text-coral-deep',
    sage: 'bg-sage-tint text-sage',
  };
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function ActionButton({ kind = 'secondary', disabled, onClick, children }) {
  const kinds = {
    primary:
      'rounded-full bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-deep transition-colors',
    secondary:
      'rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-coral hover:text-coral-deep',
    danger:
      'rounded-full border border-coral-deep/40 px-4 py-2 text-sm font-medium text-coral-deep transition-colors hover:bg-coral-tint',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${kinds[kind]} disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('pending');
  const [articles, setArticles] = useState([]);
  const [removals, setRemovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [busySlug, setBusySlug] = useState(null);

  const activeTab = TABS.find((t) => t.id === tab) || TABS[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setExpandedId(null);
    try {
      const url = activeTab.status
        ? `/api/admin/articles?status=${activeTab.status}`
        : '/api/admin/removals';
      const res = await fetch(url);
      if (res.status === 401) {
        setError('Session expired. Reload the page and log in again.');
        setArticles([]);
        setRemovals([]);
        setLoading(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else if (activeTab.status) {
        setArticles(Array.isArray(data.articles) ? data.articles : []);
      } else {
        setRemovals(Array.isArray(data.removals) ? data.removals : []);
      }
    } catch {
      setError('Something went wrong.');
    }
    setLoading(false);
  }, [activeTab.status]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(article, action, extra = {}) {
    setBusySlug(article.slug);
    setNotice('');
    setError('');
    try {
      const res = await fetch(
        `/api/admin/articles/${encodeURIComponent(article.slug)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...extra }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        let msg = `${DONE_LABELS[action] || 'Updated'} "${article.title}".`;
        if (data.charge) {
          msg += data.charge.ok
            ? ' Charged £100.'
            : ` Charge failed: ${data.charge.reason || 'unknown'} - the card can be retried by publishing again.`;
        }
        setNotice(msg);
        await load();
      }
    } catch {
      setError('Something went wrong.');
    }
    setBusySlug(null);
  }

  function handlePublish(article) {
    const willCharge =
      article.origin === 'submission' &&
      article.stripe?.hasCard &&
      !article.featured?.active;
    const message = willCharge
      ? `Publish "${article.title}"?\n\nThe submitter saved a card for Featured - publishing will charge £100 now.`
      : `Publish "${article.title}"?`;
    if (!window.confirm(message)) return;
    runAction(article, 'publish');
  }

  function handleReject(article) {
    const reason = window.prompt(
      `Reason for rejecting "${article.title}" (the submitter will be emailed):`
    );
    if (reason === null) return;
    runAction(article, 'reject', { reason: reason.trim() });
  }

  function handleRemove(article) {
    if (
      !window.confirm(
        `Remove "${article.title}"?\n\nThe page will stop being served.`
      )
    ) {
      return;
    }
    runAction(article, 'remove');
  }

  function renderActions(article) {
    const busy = busySlug === article.slug;
    if (article.status === 'pending' || article.status === 'draft') {
      return (
        <div className="flex flex-wrap gap-2">
          <ActionButton
            kind="primary"
            disabled={busy}
            onClick={() => handlePublish(article)}
          >
            Publish
          </ActionButton>
          {article.status === 'pending' && (
            <ActionButton disabled={busy} onClick={() => handleReject(article)}>
              Reject
            </ActionButton>
          )}
        </div>
      );
    }
    if (article.status === 'published') {
      return (
        <div className="flex flex-wrap gap-2">
          <ActionButton
            disabled={busy}
            onClick={() => runAction(article, 'unpublish')}
          >
            Unpublish
          </ActionButton>
          <ActionButton
            kind="danger"
            disabled={busy}
            onClick={() => handleRemove(article)}
          >
            Remove
          </ActionButton>
          {article.featured?.active && (
            <ActionButton
              disabled={busy}
              onClick={() => runAction(article, 'feature-off')}
            >
              Feature off
            </ActionButton>
          )}
        </div>
      );
    }
    return null;
  }

  function renderArticleRow(article) {
    const expanded = expandedId === article._id;
    const isSubmission = article.origin === 'submission';
    return (
      <li
        key={article._id}
        className="rounded-xl border border-line bg-white p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : article._id)}
              className="text-left font-display text-lg leading-snug hover:text-coral-deep"
            >
              {article.title}
            </button>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral">{article.category}</Badge>
              <Badge tone={isSubmission ? 'sage' : 'neutral'}>
                {isSubmission ? 'Submission' : 'Generated'}
              </Badge>
              {article.featured?.category && !article.featured?.active && (
                <Badge tone="coral">Featured requested</Badge>
              )}
              {article.stripe?.hasCard && <Badge tone="neutral">Card saved</Badge>}
              {article.stripe?.charged && <Badge tone="sage">Charged</Badge>}
              {article.featured?.active && <Badge tone="coral">Featured live</Badge>}
              <span className="text-xs text-ink-faint">
                {formatDate(article.createdAt)}
              </span>
            </div>
            {isSubmission && (
              <p className="mt-1.5 text-xs text-ink-soft">
                {article.submitterEmail || 'No email on record'}
                {article.submitterEmail && (
                  <span
                    className={
                      article.emailConfirmed
                        ? 'ml-1.5 font-medium text-sage'
                        : 'ml-1.5 text-ink-faint'
                    }
                  >
                    {article.emailConfirmed ? '✓ confirmed' : 'not confirmed'}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="shrink-0">{renderActions(article)}</div>
        </div>

        {expanded && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-sm italic text-ink-soft">{article.dek}</p>
            <p className="mt-2 text-xs text-ink-faint">
              Byline: {article.byline?.name || 'Live Laugh Local team'} (
              {article.byline?.kind || 'staff'})
            </p>
            {article.rejectionReason && (
              <p className="mt-2 text-xs text-coral-deep">
                Rejection reason: {article.rejectionReason}
              </p>
            )}
            {article.heroImage?.url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={article.heroImage.url}
                alt={article.heroImage.alt || article.title}
                className="mt-3 max-h-40 rounded-lg border border-line"
              />
            )}
            {/* Admin-only preview. bodyHtml was sanitized at write time. */}
            <div
              className="article-body mt-4 max-w-article"
              dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
            />
          </div>
        )}
      </li>
    );
  }

  function renderRemovals() {
    if (removals.length === 0 && !loading) {
      return <p className="text-sm text-ink-faint">No removal requests yet.</p>;
    }
    return (
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {removals.map((r) => (
              <tr key={r._id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">{r.slug}</td>
                <td className="px-4 py-3">{r.email}</td>
                <td className="px-4 py-3">
                  <Badge
                    tone={
                      r.status === 'confirmed'
                        ? 'sage'
                        : r.status === 'mismatched'
                          ? 'coral'
                          : 'neutral'
                    }
                  >
                    {r.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-ink-faint">
                  {formatDate(r.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Admin</h1>
      <p className="mt-1 text-sm text-ink-faint">
        Review queue and removal requests. Boring on purpose.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? 'rounded-full bg-ink px-4 py-2 text-sm font-medium text-white'
                : 'rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-coral hover:text-coral-deep'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice && (
        <p className="mt-4 rounded-lg bg-sage-tint px-4 py-2.5 text-sm text-ink">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-coral-tint px-4 py-2.5 text-sm text-coral-deep">
          {error}
        </p>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-ink-faint">Loading...</p>
        ) : activeTab.status ? (
          articles.length === 0 ? (
            <p className="text-sm text-ink-faint">Nothing here.</p>
          ) : (
            <ul className="space-y-3">{articles.map(renderArticleRow)}</ul>
          )
        ) : (
          renderRemovals()
        )}
      </div>
    </div>
  );
}
