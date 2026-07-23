import mongoose from 'mongoose';

// Cookieless server-side analytics: one row per path per day, $inc'd via beacon.
const PageViewSchema = new mongoose.Schema({
  path: { type: String, required: true },
  day: { type: String, required: true }, // YYYY-MM-DD
  count: { type: Number, default: 0 },
});

PageViewSchema.index({ path: 1, day: 1 }, { unique: true });

export default mongoose.models.PageView || mongoose.model('PageView', PageViewSchema);
