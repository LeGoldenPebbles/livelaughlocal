import mongoose from 'mongoose';

// Referrer counts per day. Source is a bare hostname ('google.com') or
// 'direct'. Internal navigation is never recorded.
const RefStatSchema = new mongoose.Schema({
  day: { type: String, required: true }, // YYYY-MM-DD
  source: { type: String, required: true },
  count: { type: Number, default: 0 },
});

RefStatSchema.index({ day: 1, source: 1 }, { unique: true });

export default mongoose.models.RefStat || mongoose.model('RefStat', RefStatSchema);
