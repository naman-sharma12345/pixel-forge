import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../constants.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: 'Role must be buyer, creator, or admin'
      },
      default: 'buyer'
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    avatarKey: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
      default: ''
    },
    socials: {
      website: { type: String, default: '' },
      twitter: { type: String, default: '' },
      itchio: { type: String, default: '' },
      github: { type: String, default: '' }
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset'
      }
    ],
    tokenVersion: {
      type: Number,
      default: 0
    },
    isBanned: {
      type: Boolean,
      default: false
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

userSchema.methods.comparePassword = async function (plain) {
  if (!this.passwordHash) {
    throw new Error('passwordHash is required on user instance to compare password');
  }
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = async function (plain) {
  return bcrypt.hash(plain, 12);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
