import mongoose from 'mongoose';

const HouseAdSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    slot: {
      type: String,
      enum: ['any', 'in-feed', 'in-article', 'sidebar'],
      default: 'any',
    },
    headline: { type: String, required: true, maxlength: 80 },
    body: { type: String, maxlength: 200 },
    cta: { type: String, maxlength: 40 },
    targetUrl: { type: String, required: true },
    imageUrl: String,
    weight: { type: Number, default: 1, min: 0, max: 10 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.HouseAd || mongoose.model('HouseAd', HouseAdSchema);
