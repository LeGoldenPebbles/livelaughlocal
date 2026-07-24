import mongoose from 'mongoose';

// Outbound link clicks, counted per destination host per day (and per source
// article). Cookieless, no per-person data - just "how many times did readers
// leave for spacesplease.com today, and from which article". Mirrors RefStat.
const ClickStatSchema = new mongoose.Schema({
  day: { type: String, required: true }, // YYYY-MM-DD
  host: { type: String, required: true }, // destination hostname
  path: { type: String, default: '' }, // source article path
  count: { type: Number, default: 0 },
});

ClickStatSchema.index({ day: 1, host: 1, path: 1 }, { unique: true });
ClickStatSchema.index({ host: 1 });

export default mongoose.models.ClickStat ||
  mongoose.model('ClickStat', ClickStatSchema);
