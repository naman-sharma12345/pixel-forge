// STUB created by Abhishek - Adwait replaces this file
import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    pricePaid: { type: Number, required: true },
    downloadCount: { type: Number, default: 0 },
    lastDownloadedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

purchaseSchema.index({ user: 1, asset: 1 }, { unique: true });

const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);

export default Purchase;
