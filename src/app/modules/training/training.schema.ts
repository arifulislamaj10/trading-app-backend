import { model, Schema, Types } from "mongoose";

export interface ITrainingProgress {
  accountId: Types.ObjectId;
  lessonsCompleted: string[];
  quizScore: number | null;
  quizAttempts: number;
  completedAt: Date | null;
}

const trainingProgressSchema = new Schema<ITrainingProgress>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "account",
      required: true,
    },
    lessonsCompleted: { type: [String], default: [] },
    quizScore: { type: Number, default: null },
    quizAttempts: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
  },
  { versionKey: false, timestamps: true },
);

trainingProgressSchema.index({ accountId: 1 }, { unique: true });

export const Training_Progress_Model = model<ITrainingProgress>(
  "training_progress",
  trainingProgressSchema,
);
