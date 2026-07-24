import mongoose from 'mongoose';

// Cookieless unique-visitor counting (Plausible-style): hash is an HMAC-SHA256
// keyed by TOKEN_SECRET over ip|ua|day, so it cannot be reversed and rotates
// every day. No cookies, no cross-day tracking, nothing identifying stored.
const DailyUniqueSchema = new mongoose.Schema({
  day: { type: String, required: true }, // YYYY-MM-DD
  hash: { type: String, required: true },
});

DailyUniqueSchema.index({ day: 1, hash: 1 }, { unique: true });

export default mongoose.models.DailyUnique ||
  mongoose.model('DailyUnique', DailyUniqueSchema);
