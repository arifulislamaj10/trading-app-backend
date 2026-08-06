import { model, Schema, Types } from "mongoose";
import type { BroadcastAudience } from "./notification.audience";

export type ScheduledAnnouncementStatus = "pending" | "sent" | "failed";

export interface IScheduledAnnouncement {
  title: string;
  message: string;
  link: string;
  audience: BroadcastAudience;
  eventAt: Date | null;
  eventTimezone: string | null;
  scheduledSendAt: Date;
  status: ScheduledAnnouncementStatus;
  sentCount: number;
  createdBy: Types.ObjectId;
  errorMessage: string | null;
}

const scheduledAnnouncementSchema = new Schema<IScheduledAnnouncement>(
  {
    title: { type: String, required: true, maxlength: 255 },
    message: { type: String, required: true },
    link: { type: String, default: "" },
    audience: { type: Schema.Types.Mixed, required: true },
    eventAt: { type: Date, default: null },
    eventTimezone: { type: String, default: null },
    scheduledSendAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      index: true,
    },
    sentCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "account", required: true },
    errorMessage: { type: String, default: null },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

scheduledAnnouncementSchema.index({ status: 1, scheduledSendAt: 1 });

export const ScheduledAnnouncement_Model = model<IScheduledAnnouncement>(
  "scheduledAnnouncement",
  scheduledAnnouncementSchema,
);
