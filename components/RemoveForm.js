'use client';

import { useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-coral focus:outline-none';

// Accepts a full article URL or a bare slug; the slug is the last path segment.
function parseSlug(value) {
  const cleaned = String(value || '').trim().split(/[?#]/)[0];
  const parts = cleaned.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toLowerCase();
}

export default function RemoveForm() {
  const [article, setArticle] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setFailed(false);

    const errs = {};
    const slug = parseSlug(article);
    if (!slug) errs.article = 'Please paste the article link or its slug.';
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Please enter a valid email address.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await fetch('/api/remove/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email: email.trim() }),
      });
      // Deliberately the same message whatever happened - no enumeration.
      setSent(true);
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-line bg-sage-tint p-6">
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          If those details match an article, a removal link is on its way. Check your inbox
          (and spam folder) - one click and the article comes down.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="remove-article" className="mb-1 block text-sm font-medium text-ink">
          Article link or slug
        </label>
        <input
          id="remove-article"
          type="text"
          value={article}
          onChange={(e) => setArticle(e.target.value)}
          aria-invalid={Boolean(errors.article)}
          className={inputClass}
          placeholder="https://livelaughlocal.co.uk/days-out/your-article-a1b2"
        />
        {errors.article && <p className="mt-1 text-xs text-coral-deep">{errors.article}</p>}
      </div>

      <div>
        <label htmlFor="remove-email" className="mb-1 block text-sm font-medium text-ink">
          The email you submitted with
        </label>
        <input
          id="remove-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
          className={inputClass}
          placeholder="you@example.co.uk"
        />
        {errors.email && <p className="mt-1 text-xs text-coral-deep">{errors.email}</p>}
      </div>

      {failed && (
        <p className="rounded-lg border border-coral bg-coral-tint px-4 py-3 text-sm text-coral-deep">
          Something went wrong - please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-coral px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-coral-deep disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Sending...' : 'Send removal link'}
      </button>
    </form>
  );
}
