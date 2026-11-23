import mongoose from "mongoose";

const letterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 50000 },
    date: { type: Date, required: true, default: () => new Date() }
  },
  { timestamps: true }
);

letterSchema.index({ date: 1, createdAt: 1 });

export const Letter =
  mongoose.models.Letter ?? mongoose.model("Letter", letterSchema);
