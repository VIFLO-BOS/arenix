import mongoose, { Schema, Types, type Model } from "mongoose";

/**
 * Files clients attach to project requests. Kept in the database, never in a public folder,
 * and served only to signed in staff through /admin/files/[id]. Each file is at most 8 MB,
 * well inside MongoDB's 16 MB document limit.
 */
export interface PrivateFileDoc {
  _id: Types.ObjectId;
  filename: string;
  mime: string;
  size: number;
  data: Buffer;
  createdAt: Date;
}

const PrivateFileSchema = new Schema<PrivateFileDoc>(
  {
    filename: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
PrivateFileSchema.index({ createdAt: -1 });

export const PrivateFile = (mongoose.models.PrivateFile as Model<PrivateFileDoc>) || mongoose.model<PrivateFileDoc>("PrivateFile", PrivateFileSchema);
