'use client';

import { useEffect, useState } from 'react';

const inputCls =
  'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-coral focus:outline-none';

export default function ContactForm() {
  const [startedAt, setStartedAt] = useState(0);
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  useEffect(() => { setStartedAt(Date.now()); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError('');
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, startedAt }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setState('sent');
        form.reset();
      } else {
        setState('error');
        setError(json.error || 'Something went wrong - please try again.');
      }
    } catch {
      setState('error');
      setError('Something went wrong - please try again.');
    }
  };

  if (state === 'sent') {
    return (
      <div className="rounded-xl border border-line bg-white px-6 py-10 text-center">
        <p className="font-display text-3xl text-coral" aria-hidden="true">*</p>
        <h2 className="mt-3 font-display text-xl">Message received</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          Thanks - a real person reads everything that comes in. We aim to
          reply within a couple of working days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot: humans never see it, bots fill it. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">
            Your name
          </span>
          <input name="name" required maxLength={80} className={inputCls} placeholder="Jane Stallholder" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">
            Your email
          </span>
          <input name="email" type="email" required className={inputCls} placeholder="you@example.com" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">
          Subject <span className="normal-case text-ink-faint">(optional)</span>
        </span>
        <input name="subject" maxLength={120} className={inputCls} placeholder="Correction, story tip, featured question..." />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-faint">
          Message
        </span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className={inputCls}
          placeholder="Tell us what's on your mind..."
        />
      </label>
      {error && <p className="text-sm font-medium text-coral-deep">{error}</p>}
      <button
        type="submit"
        disabled={state === 'sending'}
        className="rounded-full bg-coral px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-coral-deep disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending...' : 'Send message'}
      </button>
    </form>
  );
}
