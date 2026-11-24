import mongoose from 'mongoose';

const replySchema = new mongoose.Schema(
  {
    letterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Letter', required: true, index: true },
    authorName: { type: String, required: true, trim: true, maxlength: 80 },
    message: { type: String, required: true, maxlength: 2000 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

replySchema.index({ letterId: 1, createdAt: 1 });

export const Reply = mongoose.models.Reply ?? mongoose.model('Reply', replySchema);
