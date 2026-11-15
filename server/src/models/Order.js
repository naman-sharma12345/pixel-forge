import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Asset is required'],
    },
    title: {
      type: String,
      required: [true, 'Asset title is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a non-negative integer'],
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    license: {
      type: String,
      required: [true, 'License is required'],
      enum: {
        values: ['cc0', 'standard', 'extended'],
        message: '{VALUE} is not a valid license',
      },
    },
    creatorEarning: {
      type: Number,
      required: [true, 'Creator earning is required'],
      min: [0, 'Creator earning must be a non-negative number'],
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'Order items are required'],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal must be a non-negative number'],
    },
    platformFee: {
      type: Number,
      required: [true, 'Platform fee is required'],
      min: [0, 'Platform fee must be a non-negative number'],
      default: 0,
    },
    total: {
      type: Number,
      required: [true, 'Total is required'],
      min: [0, 'Total must be a non-negative number'],
    },
    currency: {
      type: String,
      default: 'INR',
      required: [true, 'Currency is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['created', 'paid', 'failed'],
        message: '{VALUE} is not a valid order status',
      },
      default: 'created',
      required: [true, 'Status is required'],
    },
    provider: {
      type: String,
      enum: {
        values: ['mock', 'free'],
        message: '{VALUE} is not a valid payment provider',
      },
      required: [true, 'Provider is required'],
    },
    providerOrderId: {
      type: String,
      default: '',
    },
    providerPaymentId: {
      type: String,
      default: '',
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, paidAt: -1 });
orderSchema.index({ 'items.creator': 1, status: 1, paidAt: -1 });
orderSchema.index({ providerOrderId: 1 });

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;
