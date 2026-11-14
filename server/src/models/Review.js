// STUB created by Abhishek - Parth replaces this file
import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000, default: '' }
  },
  {
    timestamps: true
  }
);

reviewSchema.index({ asset: 1, user: 1 }, { unique: true });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;
