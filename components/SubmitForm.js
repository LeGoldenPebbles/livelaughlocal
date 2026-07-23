'use client';

import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, FEATURED_PRICE_GBP, FEATURED_MONTHS } from '@/lib/constants';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-coral focus:outline-none';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-coral-deep">{message}</p>;
}

function ToolbarButton({ label, title, onAction }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onAction}
      className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-coral hover:text-coral-deep"
    >
      {label}
    </button>
  );
}

export default function SubmitForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [dek, setDek] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [heroAlt, setHeroAlt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [featured, setFeatured] = useState(false);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot - humans never see it
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const editorRef = useRef(null);
  const startedAtRef = useRef(null);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  function exec(command, value) {
    document.execCommand(command, false, value);
    if (editorRef.current) setBodyHtml(editorRef.current.innerHTML);
  }

  function addLink() {
    const url = window.prompt('Link URL (https://...)');
    if (url) exec('createLink', url);
  }

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadError('');

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Only JPG, PNG or WebP images are allowed - you can still submit without an image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Images must be 5MB or under - you can still submit without an image.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setHeroUrl(data.url);
      } else {
        setUploadError(
          (data && data.error ? data.error : 'Upload failed') +
            ' - you can still submit without an image.'
        );
      }
    } catch {
      setUploadError('Upload failed - you can still submit without an image.');
    } finally {
      setUploading(false);
    }
  }

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = 'Please tell us your name.';
    else if (name.trim().length > 80) errs.name = 'Names are capped at 80 characters.';

    if (!EMAIL_RE.test(email.trim())) errs.email = 'Please enter a valid email address.';

    const t = title.trim();
    if (t.length < 5 || t.length > 120) errs.title = 'Titles need to be between 5 and 120 characters.';

    const d = dek.trim();
    if (d.length < 10 || d.length > 160) errs.dek = 'The standfirst needs to be between 10 and 160 characters.';

    if (!category) errs.category = 'Please pick a category.';

    if (location.trim().length > 80) errs.location = 'Keep the location under 80 characters.';

    const plainText = bodyHtml.replace(/<[^>]+>/g, '').trim();
    if (plainText.length < 200) {
      errs.body = 'Your story needs a bit more body text - at least 200 characters.';
    }

    if (!consent) errs.consent = 'Please confirm you have the rights to this content.';

    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          title: title.trim(),
          dek: dek.trim(),
          category,
          location: location.trim(),
          heroImage: heroUrl ? { url: heroUrl, alt: heroAlt.trim() } : null,
          bodyHtml,
          featured,
          website,
          startedAt: startedAtRef.current || Date.now(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (data && data.checkoutUrl) {
        window.location = data.checkoutUrl;
        return;
      }
      if (res.ok && data && data.ok) {
        setSubmitted(true);
      } else {
        setServerError((data && data.error) || 'Something went wrong - please try again.');
      }
    } catch {
      setServerError('Something went wrong - please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-line bg-sage-tint p-6 sm:p-8">
        <h2 className="font-display text-2xl text-ink">Nearly there - confirm your email</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          We have sent a confirmation link to <strong>{email.trim()}</strong>. Click it and your
          story joins the review queue. Nothing goes live before a human editor has read it -
          we will email you either way.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          No email after a few minutes? Check your spam folder, or write to
          hello@livelaughlocal.co.uk and we will sort it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="relative space-y-6">
      {/* Honeypot - visually hidden, bots fill it, humans never see it */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="submit-name" className="mb-1 block text-sm font-medium text-ink">
            Your name
          </label>
          <input
            id="submit-name"
            type="text"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name)}
            className={inputClass}
            placeholder="Appears as the byline"
          />
          <FieldError message={errors.name} />
        </div>
        <div>
          <label htmlFor="submit-email" className="mb-1 block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="submit-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
            className={inputClass}
            placeholder="For the confirmation link - never published"
          />
          <FieldError message={errors.email} />
        </div>
      </div>

      <div>
        <label htmlFor="submit-title" className="mb-1 block text-sm font-medium text-ink">
          Title
        </label>
        <input
          id="submit-title"
          type="text"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={Boolean(errors.title)}
          className={inputClass}
          placeholder="A clear, honest headline"
        />
        <FieldError message={errors.title} />
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <label htmlFor="submit-dek" className="block text-sm font-medium text-ink">
            Standfirst
          </label>
          <span className="text-xs text-ink-faint">{dek.length}/160</span>
        </div>
        <textarea
          id="submit-dek"
          rows={2}
          maxLength={160}
          value={dek}
          onChange={(e) => setDek(e.target.value)}
          aria-invalid={Boolean(errors.dek)}
          className={inputClass}
          placeholder="One or two sentences that sell the story"
        />
        <FieldError message={errors.dek} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="submit-category" className="mb-1 block text-sm font-medium text-ink">
            Category
          </label>
          <select
            id="submit-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-invalid={Boolean(errors.category)}
            className={inputClass}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.category} />
        </div>
        <div>
          <label htmlFor="submit-location" className="mb-1 block text-sm font-medium text-ink">
            Town or area <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <input
            id="submit-location"
            type="text"
            maxLength={80}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            aria-invalid={Boolean(errors.location)}
            className={inputClass}
            placeholder="e.g. Stockport"
          />
          <FieldError message={errors.location} />
        </div>
      </div>

      <div>
        <label htmlFor="submit-hero" className="mb-1 block text-sm font-medium text-ink">
          Hero image <span className="font-normal text-ink-faint">(optional - JPG, PNG or WebP, up to 5MB)</span>
        </label>
        <input
          id="submit-hero"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-coral-tint file:px-4 file:py-2 file:text-sm file:font-medium file:text-coral-deep hover:file:bg-coral hover:file:text-white file:transition-colors"
        />
        {uploading && <p className="mt-2 text-xs text-ink-faint">Uploading image...</p>}
        {uploadError && <p className="mt-2 text-xs text-coral-deep">{uploadError}</p>}
        {heroUrl && (
          <div className="mt-3">
            <img
              src={heroUrl}
              alt={heroAlt || 'Preview of your uploaded image'}
              className="aspect-[3/2] w-full max-w-sm rounded-lg border border-line object-cover"
            />
            <div className="mt-2 max-w-sm">
              <label htmlFor="submit-hero-alt" className="mb-1 block text-sm font-medium text-ink">
                Describe the image
              </label>
              <input
                id="submit-hero-alt"
                type="text"
                maxLength={160}
                value={heroAlt}
                onChange={(e) => setHeroAlt(e.target.value)}
                className={inputClass}
                placeholder="For readers using screen readers"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setHeroUrl('');
                setHeroAlt('');
              }}
              className="mt-2 text-xs text-ink-faint underline underline-offset-2 hover:text-coral-deep"
            >
              Remove image
            </button>
          </div>
        )}
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-ink">Your story</span>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <ToolbarButton label="B" title="Bold" onAction={() => exec('bold')} />
          <ToolbarButton label="I" title="Italic" onAction={() => exec('italic')} />
          <ToolbarButton label="H2" title="Heading" onAction={() => exec('formatBlock', 'H2')} />
          <ToolbarButton label="H3" title="Subheading" onAction={() => exec('formatBlock', 'H3')} />
          <ToolbarButton label="• List" title="Bulleted list" onAction={() => exec('insertUnorderedList')} />
          <ToolbarButton label="1. List" title="Numbered list" onAction={() => exec('insertOrderedList')} />
          <ToolbarButton label="Quote" title="Quote" onAction={() => exec('formatBlock', 'BLOCKQUOTE')} />
          <ToolbarButton label="Link" title="Add a link" onAction={addLink} />
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Story body"
          data-placeholder="Write your story..."
          onInput={(e) => setBodyHtml(e.currentTarget.innerHTML)}
          className="editor-surface article-body rounded-lg border border-line bg-white p-4"
        />
        <FieldError message={errors.body} />
      </div>

      <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="mt-1 h-4 w-4 accent-coral"
          />
          <span>
            <span className="block text-sm font-medium text-ink">
              Feature this article - £{FEATURED_PRICE_GBP} for {FEATURED_MONTHS} months
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
              Your card is authorised now through Stripe but charged only if we approve and
              publish your story. If we do not publish, nothing is taken. Featured articles sit
              at the top of their category and are clearly labelled Sponsored.
            </span>
          </span>
        </label>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            aria-invalid={Boolean(errors.consent)}
            className="mt-1 h-4 w-4 accent-coral"
          />
          <span className="text-sm leading-relaxed text-ink-soft">
            I confirm I have the rights to this content and any images, and I accept the{' '}
            <a href="/privacy" className="text-coral-deep underline underline-offset-2">
              privacy policy
            </a>
            .
          </span>
        </label>
        <FieldError message={errors.consent} />
      </div>

      {serverError && (
        <p className="rounded-lg border border-coral bg-coral-tint px-4 py-3 text-sm text-coral-deep">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || uploading}
        className="rounded-full bg-coral px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-coral-deep disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Submitting...' : 'Submit your story'}
      </button>
    </form>
  );
}
