'use client';

import { useState } from 'react';

export default function AdminLogin() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      if (res.status === 429) {
        setError('Too many attempts. Wait 15 minutes and try again.');
      } else if (res.status === 401) {
        setError('Wrong key.');
      } else {
        setError('Something went wrong. Try again.');
      }
    } catch {
      setError('Something went wrong. Try again.');
    }
    setBusy(false);
  }

  return (
    <div className="flex justify-center py-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-line bg-white p-6"
      >
        <h1 className="font-display text-2xl">Admin</h1>
        <p className="mt-1 text-sm text-ink-faint">
          This area is for the editor only.
        </p>
        <label
          htmlFor="admin-key"
          className="mt-5 block text-sm font-medium text-ink-soft"
        >
          Key
        </label>
        <input
          id="admin-key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-coral focus:outline-none"
        />
        {error && <p className="mt-3 text-sm text-coral-deep">{error}</p>}
        <button
          type="submit"
          disabled={busy || !key}
          className="mt-5 w-full rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-deep disabled:opacity-50"
        >
          {busy ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </div>
  );
}
