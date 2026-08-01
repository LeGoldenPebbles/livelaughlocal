import mongoose from 'mongoose';

/**
 * One row per pageview, tagged with the SAME cookieless daily hash that
 * DailyUnique uses (HMAC-SHA256 of ip|ua|day keyed by TOKEN_SECRET).
 *
 * WHY THIS EXISTS: PageView only ever stored {path, day, count}. That answers
 * "how many views did this page get" and nothing else. It cannot answer the
 * questions that actually matter for an editorial site: where do people land,
 * do they read a second article, which piece sends them onward, and where do
 * they leave. There was no journey tracking of any kind.
 *
 * WHY IT DOES NOT CHANGE THE PRIVACY POSITION: it reuses the existing hash
 * rather than introducing an identifier. The hash is not reversible, is not a
 * cookie, and rotates at midnight, so a journey can only ever be reconstructed
 * within a single day and never linked to a person or across days. That is what
 * lets this site run with no consent banner, and nothing here weakens it.
 *
 * Rows self-delete after 30 days via the TTL index below, so the collection
 * stays bounded and the data does not accumulate indefinitely.
 */
const VisitorHitSchema = new mongoose.Schema({
  day: { type: String, required: true }, // YYYY-MM-DD, matches DailyUnique
  hash: { type: String, required: true }, // the daily visitor hash
  path: { type: String, required: true },
  at: { type: Date, required: true, default: Date.now },
});

// Reconstructing a journey means fetching one visitor's hits for one day in
// order, so this is the index that matters.
VisitorHitSchema.index({ day: 1, hash: 1, at: 1 });

// Bounded retention. Mongo drops these automatically after 30 days.
VisitorHitSchema.index({ at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.models.VisitorHit ||
  mongoose.model('VisitorHit', VisitorHitSchema);
