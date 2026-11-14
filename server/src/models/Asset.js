// STUB created by Abhishek - Parth replaces this file
import mongoose from 'mongoose';
import { CATEGORIES, LICENSES, ASSET_STATUSES } from '../constants.js';

const previewSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    key: { type: String, required: true },
    kind: { type: String, enum: ['image', 'audio'], required: true }
  },
  { _id: false }
);

const assetSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, minlength: 3, maxlength: 80, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, minlength: 20, maxlength: 5000 },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true, enum: CATEGORIES },
    mediaKind: { type: String, required: true, enum: ['image', 'audio', 'other'] },
    tags: [{ type: String, lowercase: true, trim: true }],
    price: { type: Number, required: true, min: 0, max: 50000, default: 0 },
    license: { type: String, enum: LICENSES, default: 'standard' },
    fileFormats: [{ type: String, lowercase: true, trim: true }],
    meta: {
      resolution: { type: String },
      frames: { type: Number },
      durationSec: { type: Number },
      bpm: { type: Number },
      loopable: { type: Boolean },
      sampleRate: { type: Number }
    },
    thumbnail: {
      url: { type: String, required: true },
      key: { type: String, required: true }
    },
    previews: [previewSchema],
    file: {
      type: {
        key: { type: String, required: true },
        format: { type: String, required: true },
        mimeType: { type: String, required: true },
        bytes: { type: Number, required: true },
        originalName: { type: String, required: true }
      },
      select: false
    },
    fileInfo: {
      format: { type: String, required: true },
      bytes: { type: Number, required: true },
      originalName: { type: String, required: true }
    },
    status: { type: String, enum: ASSET_STATUSES, default: 'published' },
    rejectionReason: { type: String, default: '' },
    isFeatured: { type: Boolean, default: false },
    stats: {
      views: { type: Number, default: 0 },
      downloads: { type: Number, default: 0 },
      sales: { type: Number, default: 0 },
      ratingAvg: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
      wishlistCount: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

assetSchema.index(
  { title: 'text', tags: 'text', description: 'text' },
  { weights: { title: 10, tags: 5, description: 1 } }
);
assetSchema.index({ category: 1, status: 1 });
assetSchema.index({ price: 1 });
assetSchema.index({ createdAt: -1 });
assetSchema.index({ 'stats.sales': -1 });
assetSchema.index({ 'stats.ratingAvg': -1 });

const Asset = mongoose.models.Asset || mongoose.model('Asset', assetSchema);

export default Asset;
