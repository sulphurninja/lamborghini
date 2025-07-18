import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  plan_expiry: { type: Date, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'super-seller', 'seller', 'user'], 
    default: 'user' 
  },
  credits: { type: Number, default: 0 },
  pricing: {
    seller_creation_cost: { type: Number, default: 0 }, // Cost for creating a seller
    user_creation_cost: { type: Number, default: 0 }    // Cost for creating a user
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.User || mongoose.model('User', userSchema);