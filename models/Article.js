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
