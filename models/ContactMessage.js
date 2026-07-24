import mongoose from 'mongoose';

// Contact-form messages. Stored BEFORE any email attempt so a mail outage can
// never lose a message - the email to the team inbox is a notification, not
// the source of truth.
const ContactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, trim: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 5000 },
    emailed: { type: Boolean, default: false }, // notification delivered?
  },
  { timestamps: true }
);

ContactMessageSchema.index({ createdAt: -1 });

export default mongoose.models.ContactMessage ||
  mongoose.model('ContactMessage', ContactMessageSchema);
