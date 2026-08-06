import { model, Schema, Types } from "mongoose";

export interface IAcademyCategory {
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAcademyVideo {
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnailUrl: string | null;
  categoryId: Types.ObjectId;
  categoryName: string;
  durationSeconds: number | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const academyCategorySchema = new Schema<IAcademyCategory>(
  {
    name: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true },
);

academyCategorySchema.index({ isActive: 1, sortOrder: 1 });
academyCategorySchema.index({ name: 1 }, { unique: true });

const academyVideoSchema = new Schema<IAcademyVideo>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    youtubeUrl: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, default: null },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "academy_category",
      required: true,
    },
    categoryName: { type: String, default: "" },
    durationSeconds: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true },
);

academyVideoSchema.index({ isActive: 1, categoryId: 1, createdAt: -1 });
academyVideoSchema.index({ categoryId: 1 });

export const Academy_Category_Model = model<IAcademyCategory>(
  "academy_category",
  academyCategorySchema,
);

export const Academy_Video_Model = model<IAcademyVideo>(
  "academy_video",
  academyVideoSchema,
);
