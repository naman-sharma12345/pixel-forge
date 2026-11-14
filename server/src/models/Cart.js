// STUB created by Abhishek - Adwait replaces this file
import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema]
  },
  {
    timestamps: true
  }
);

const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

export default Cart;
