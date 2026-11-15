import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Asset is required'],
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    pricePaid: {
      type: Number,
      required: [true, 'Price paid is required'],
      min: [0, 'Price paid cannot be negative'],
      default: 0,
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: [0, 'Download count cannot be negative'],
    },
    lastDownloadedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

purchaseSchema.index({ user: 1, asset: 1 }, { unique: true });
purchaseSchema.index({ asset: 1, createdAt: -1 });

export const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
export default Purchase;
