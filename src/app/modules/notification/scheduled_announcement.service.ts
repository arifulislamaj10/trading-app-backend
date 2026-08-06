import { Types } from "mongoose";
import logger from "../../configs/logger";
import { ScheduledAnnouncement_Model } from "./scheduled_announcement.schema";
import { BroadcastAudience, BroadcastEventTime } from "./notification.audience";
import { notification_services } from "./notification.service";

interface ScheduleAnnouncementInput {
  title: string;
  message: string;
  link?: string;
  audience: BroadcastAudience;
  eventTime?: BroadcastEventTime;
  scheduledSendAt: Date;
  createdBy: string;
}

const schedule_announcement = async (input: ScheduleAnnouncementInput) => {
  const doc = await ScheduledAnnouncement_Model.create({
    title: input.title,
    message: input.message,
    link: input.link || "",
    audience: input.audience,
    eventAt: input.eventTime?.eventAt
      ? new Date(input.eventTime.eventAt)
      : null,
    eventTimezone: input.eventTime?.eventTimezone ?? null,
    scheduledSendAt: input.scheduledSendAt,
    status: "pending",
    sentCount: 0,
    createdBy: new Types.ObjectId(input.createdBy),
    errorMessage: null,
  });

  return {
    scheduledId: doc._id.toString(),
    scheduledSendAt: doc.scheduledSendAt,
  };
};

const process_due_announcements = async () => {
  const now = new Date();
  const due = await ScheduledAnnouncement_Model.find({
    status: "pending",
    scheduledSendAt: { $lte: now },
  }).limit(50);

  if (due.length === 0) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const item of due) {
    try {
      const eventTime =
        item.eventAt && item.eventTimezone
          ? {
              eventAt: item.eventAt.toISOString(),
              eventTimezone: item.eventTimezone,
            }
          : undefined;

      const result = await notification_services.broadcast_announcement(
        item.title,
        item.message,
        item.link,
        item.audience as BroadcastAudience,
        undefined,
        eventTime,
      );

      item.status = "sent";
      item.sentCount = result.sentCount;
      item.errorMessage = null;
      await item.save();
      sent += 1;

      logger.info(
        `📢 Scheduled announcement ${item._id} sent to ${result.sentCount} user(s)`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      item.status = "failed";
      item.errorMessage = message;
      await item.save();
      failed += 1;
      logger.error(`❌ Scheduled announcement ${item._id} failed: ${message}`);
    }
  }

  return { processed: due.length, sent, failed };
};

export const scheduled_announcement_services = {
  schedule_announcement,
  process_due_announcements,
};
