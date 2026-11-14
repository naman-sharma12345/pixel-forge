// STUB created by Abhishek - Adwait replaces this file
import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    license: { type: String, required: true },
    creatorEarning: { type: Number, required: true }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    total: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    provider: { type: String, enum: ['mock', 'free'], required: true },
    providerOrderId: { type: String },
    providerPaymentId: { type: String },
    paidAt: { type: Date }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;
