import mongoose from 'mongoose';

// Audit trail for article removal requests (the actual authz is the HMAC link).
const RemovalRequestSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['requested', 'emailed', 'confirmed', 'mismatched'],
      default: 'requested',
    },
    ip: String,
  },
  { timestamps: true }
);

export default mongoose.models.RemovalRequest ||
  mongoose.model('RemovalRequest', RemovalRequestSchema);
