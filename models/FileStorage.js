import mongoose from 'mongoose';

// Every uploaded image, tracked in the livelaughlocal database. The bytes live
// in Cloudflare R2 (bucket "livelaughlocal"); this is the index over them -
// so an image can be traced, and orphans swept, without listing the bucket.
const FileStorageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // R2 object key
    url: { type: String, required: true }, // public serving URL
    contentType: { type: String, required: true },
    size: { type: Number, required: true }, // bytes
    ip: { type: String }, // uploader IP (abuse tracing; not shown anywhere)
    // Linked to an article once one is submitted with this hero. Until then the
    // upload is "orphaned" and a future sweep can reclaim it.
    articleSlug: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.FileStorage ||
  mongoose.model('FileStorage', FileStorageSchema);
