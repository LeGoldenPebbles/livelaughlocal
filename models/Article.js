import mongoose from 'mongoose';
import { CATEGORY_SLUGS } from '@/lib/constants';

const ArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    dek: { type: String, required: true, trim: true, maxlength: 160 },
    heroImage: {
      url: String,
      alt: String,
      credit: String,
      // Dedicated 1200x630 share card built by scripts/make-social-cards.mjs.
      // Declared here or Mongoose strips it on any re-save through the model,
      // silently reverting shares to the wrongly-shaped hero.
      social: {
        url: String,
        width: Number,
        height: Number,
      },
    },
    bodyHtml: { type: String, required: true },
    /**
     * What kind of article this is. Drives the JSON-LD @type and whether the
     * piece belongs in the Google News sitemap.
     *
     *   news    - something was announced, confirmed, cancelled, priced, fined,
     *             closed or consulted on, with a date attached. NewsArticle.
     *   listing - what's on: events, dates, prices, deadlines. Time-bound but
     *             nothing was announced, so it is NOT news. Article.
     *   guide   - evergreen how-to. The answer barely moves. Article.
     *
     * Defaults to `listing` deliberately. It is the commonest shape here, it is
     * what a public submission almost always is, and being wrongly left out of
     * the news sitemap is a far smaller harm than wrongly claiming NewsArticle
     * on 32 of 39 articles, which is what we did before this field existed.
     *
     * `listing` and `guide` both emit Article today. They stay separate values
     * because the editorial difference is real (a listing rots on a date, a
     * guide is updated in place) and because listings are where ItemList markup
     * would go if we ever add it.
     */
    articleType: {
      type: String,
      enum: ['news', 'listing', 'guide'],
      default: 'listing',
      index: true,
    },
    category: { type: String, enum: CATEGORY_SLUGS, required: true, index: true },
    locations: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],
    byline: {
      name: { type: String, default: 'Live Laugh Local team', trim: true, maxlength: 80 },
      kind: { type: String, enum: ['staff', 'contributor'], default: 'staff' },
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected', 'removed'],
      default: 'draft',
      index: true,
    },
    origin: { type: String, enum: ['generated', 'submission'], required: true },
    // Submissions only. Used for removal-request matching. Never rendered.
    submitterEmail: { type: String, lowercase: true, trim: true },
    emailConfirmed: { type: Boolean, default: false },
    featured: {
      active: { type: Boolean, default: false },
      until: Date,
      category: String,
    },
    stripe: {
      customerId: String,
      paymentMethodId: String,
      checkoutSessionId: String,
      chargeId: String,
    },
    seo: {
      metaTitle: { type: String, maxlength: 70 },
      metaDesc: { type: String, maxlength: 160 },
    },
    sourceEventIds: [String],
    rejectionReason: String,
    publishedAt: Date,
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ArticleSchema.index({ status: 1, publishedAt: -1 });
ArticleSchema.index({ category: 1, status: 1, publishedAt: -1 });
ArticleSchema.index({ 'featured.active': 1, 'featured.until': 1 });

export default mongoose.models.Article || mongoose.model('Article', ArticleSchema);
