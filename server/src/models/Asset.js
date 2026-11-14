import mongoose from 'mongoose';
import slugify from 'slugify';
import { nanoid } from 'nanoid';
import { CATEGORIES, MEDIA_KIND_BY_CATEGORY, LICENSES } from '../constants.js';

const { Schema } = mongoose;

const previewSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    kind: {
      type: String,
      enum: ['image', 'audio'],
      required: true,
    },
  },
  { _id: false }
);

const metaSchema = new Schema(
  {
    resolution: { type: String, trim: true },
    frames: { type: Number },
    durationSec: { type: Number },
    bpm: { type: Number },
    loopable: { type: Boolean },
    sampleRate: { type: Number },
  },
  { _id: false }
);

const fileInfoSchema = new Schema(
  {
    format: { type: String, default: '', trim: true },
    bytes: { type: Number, default: 0 },
    originalName: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const fileSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    format: { type: String, default: '', trim: true },
    mimeType: { type: String, default: '', trim: true },
    bytes: { type: Number, default: 0 },
    originalName: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const statsSchema = new Schema(
  {
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const assetSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 80,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 5000,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORIES,
    },
    mediaKind: {
      type: String,
      required: true,
      enum: ['image', 'audio', 'other'],
    },
    tags: {
      type: [String],
      default: [],
      set: (val) => {
        if (!Array.isArray(val)) return [];
        return val
          .map((t) => (typeof t === 'string' ? t.trim().toLowerCase().slice(0, 24) : ''))
          .filter(Boolean)
          .slice(0, 10);
      },
    },
    price: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 50000,
      validate: {
        validator: Number.isInteger,
        message: 'Price must be an integer',
      },
    },
    license: {
      type: String,
      enum: LICENSES,
      default: 'standard',
    },
    fileFormats: {
      type: [String],
      default: [],
      set: (val) => {
        if (!Array.isArray(val)) return [];
        return val
          .map((f) => (typeof f === 'string' ? f.trim().toLowerCase() : ''))
          .filter(Boolean);
      },
    },
    meta: {
      type: metaSchema,
      default: () => ({}),
    },
    thumbnail: {
      url: { type: String, required: true, trim: true },
      key: { type: String, required: true, trim: true },
    },
    previews: {
      type: [previewSchema],
      default: [],
      validate: {
        validator: (val) => Array.isArray(val) && val.length <= 6,
        message: 'Previews cannot exceed 6 items',
      },
    },
    file: {
      type: fileSchema,
      select: false,
    },
    fileInfo: {
      type: fileInfoSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['published', 'rejected', 'archived'],
      default: 'published',
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    stats: {
      type: statsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

assetSchema.pre('validate', function (next) {
  if (this.category) {
    if (MEDIA_KIND_BY_CATEGORY && MEDIA_KIND_BY_CATEGORY[this.category]) {
      this.mediaKind = MEDIA_KIND_BY_CATEGORY[this.category];
    } else if (['sfx', 'music'].includes(this.category)) {
      this.mediaKind = 'audio';
    } else if (['fonts', '3d'].includes(this.category)) {
      this.mediaKind = 'other';
    } else {
      this.mediaKind = 'image';
    }
  }

  if (!this.slug && this.title) {
    const baseSlug = slugify(this.title, { lower: true, strict: true }) || 'asset';
    this.slug = `${baseSlug}-${nanoid(6).toLowerCase()}`;
  }

  next();
});

assetSchema.index(
  { title: 'text', tags: 'text', description: 'text' },
  { weights: { title: 10, tags: 5, description: 1 }, name: 'asset_text_search' }
);
assetSchema.index({ category: 1, status: 1 });
assetSchema.index({ price: 1 });
assetSchema.index({ createdAt: -1 });
assetSchema.index({ 'stats.sales': -1 });
assetSchema.index({ 'stats.ratingAvg': -1 });

const Asset = mongoose.models.Asset || mongoose.model('Asset', assetSchema);

export default Asset;
