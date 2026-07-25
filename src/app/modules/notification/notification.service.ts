import { AppError } from '../../utils/app_error';
import httpStatus from 'http-status';
import { Notification_Model, NotificationType } from './notification.schema';
import { Types } from 'mongoose';
import logger from '../../configs/logger';
import {
  audienceFromLegacyTargetRole,
  BroadcastAudience,
  BroadcastEventTime,
  resolveAudienceRecipients,
} from './notification.audience';

export type { BroadcastAudience, BroadcastEventTime, AudienceType } from './notification.audience';
export { resolveAudienceRecipients, audienceFromLegacyTargetRole } from './notification.audience';

interface TCreateNotification {
  accountId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, unknown>;
}

/**
 * Create a single notification safely.
 * Catches and logs errors internally so callers are not blocked.
 * Returns the created notification or null on failure.
 */
const create_notification = async (data: TCreateNotification) => {
  try {
    const notification = await Notification_Model.create({
      accountId: new Types.ObjectId(data.accountId),
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link || '',
      data: data.data || {},
    });
    return notification;
  } catch (error: any) {
    logger.error(
      `❌ Notification creation failed for user ${data.accountId} [${data.type}]: ${error.message}`
    );
    return null;
  }
};

/**
 * Create multiple notifications in bulk safely.
 * Uses insertMany for efficiency, catches errors per-batch.
 * Returns the count of successfully created notifications.
 */
const create_many_notifications = async (notifications: TCreateNotification[]) => {
  if (notifications.length === 0) return { createdCount: 0 };

  try {
    const docs = notifications.map((n) => ({
      accountId: new Types.ObjectId(n.accountId),
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link || '',
      data: n.data || {},
    }));

    const created = await Notification_Model.insertMany(docs, { ordered: false });

    return { createdCount: created.length };
  } catch (error: any) {
    // insertMany with ordered:false may partially succeed
    const inserted = Array.isArray(error?.insertedDocs) ? error.insertedDocs.length : 0;
    if (inserted > 0) {
      return { createdCount: inserted };
    }
    logger.error(
      `❌ Bulk notification creation failed (${notifications.length} notifications): ${error.message}`
    );
    return { createdCount: 0 };
  }
};

/**
 * Get notifications for a user with pagination
 */
const get_my_notifications = async (
  accountId: string,
  page: number = 1,
  limit: number = 20,
  filters: { isRead?: boolean; type?: string } = {}
) => {
  const skip = (page - 1) * limit;
  const query: Record<string, unknown> = { accountId: new Types.ObjectId(accountId) };

  if (filters.isRead !== undefined) {
    query.isRead = filters.isRead;
  }
  if (filters.type) {
    query.type = filters.type;
  }

  const notifications = await Notification_Model.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notification_Model.countDocuments(query);
  const unreadCount = await Notification_Model.countDocuments({
    accountId: new Types.ObjectId(accountId),
    isRead: false,
  });

  return {
    data: notifications,
    unreadCount,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update a notification (currently supports toggling isRead status)
 */
const update_notification = async (accountId: string, notificationId: string, data: { isRead?: boolean }) => {
  if (!Types.ObjectId.isValid(notificationId)) {
    throw new AppError('Invalid notification ID', httpStatus.BAD_REQUEST);
  }

  const notification = await Notification_Model.findOne({
    _id: new Types.ObjectId(notificationId),
    accountId: new Types.ObjectId(accountId),
  });

  if (!notification) {
    throw new AppError('Notification not found', httpStatus.NOT_FOUND);
  }

  if (data.isRead !== undefined) {
    notification.isRead = data.isRead;
    await notification.save();
  }

  return notification;
};

/**
 * Mark a single notification as read (kept for backward compatibility, delegates to update_notification)
 */
const mark_as_read = async (accountId: string, notificationId: string) => {
  return update_notification(accountId, notificationId, { isRead: true });
};

/**
 * Mark all notifications as read for a user
 */
const mark_all_as_read = async (accountId: string) => {
  const result = await Notification_Model.updateMany(
    { accountId: new Types.ObjectId(accountId), isRead: false },
    { $set: { isRead: true } }
  );

  return { markedCount: result.modifiedCount };
};

/**
 * Delete a notification
 */
const delete_notification = async (accountId: string, notificationId: string) => {
  if (!Types.ObjectId.isValid(notificationId)) {
    throw new AppError('Invalid notification ID', httpStatus.BAD_REQUEST);
  }

  const deleted = await Notification_Model.findOneAndDelete({
    _id: new Types.ObjectId(notificationId),
    accountId: new Types.ObjectId(accountId),
  });

  if (!deleted) {
    throw new AppError('Notification not found', httpStatus.NOT_FOUND);
  }

  return { message: 'Notification deleted' };
};

/**
 * Get unread notification count for a user
 */
const get_unread_count = async (accountId: string) => {
  const count = await Notification_Model.countDocuments({
    accountId: new Types.ObjectId(accountId),
    isRead: false,
  });

  return { unreadCount: count };
};

/**
 * Admin: broadcast announcement to a resolved audience
 */
const broadcast_announcement = async (
  title: string,
  message: string,
  link?: string,
  audience?: BroadcastAudience,
  legacyTargetRole?: string,
  eventTime?: BroadcastEventTime
) => {
  const resolvedAudience =
    audience ?? audienceFromLegacyTargetRole(legacyTargetRole);

  const recipientIds = await resolveAudienceRecipients(resolvedAudience);

  if (recipientIds.length === 0) {
    return { sentCount: 0 };
  }

  const notificationData: Record<string, unknown> = {};
  if (eventTime) {
    notificationData.eventAt = eventTime.eventAt;
    notificationData.eventTimezone = eventTime.eventTimezone;
  }

  const notifications = recipientIds.map((accountId) => ({
    accountId,
    type: 'system_announcement' as NotificationType,
    title,
    message,
    link: link || '',
    data: notificationData,
  }));

  const result = await create_many_notifications(notifications);

  return { sentCount: result.createdCount };
};

const get_notification_by_id = async (accountId: string, notificationId: string) => {
  if (!Types.ObjectId.isValid(notificationId)) {
    throw new AppError('Invalid notification ID', httpStatus.BAD_REQUEST);
  }

  const notification = await Notification_Model.findOne({
    _id: new Types.ObjectId(notificationId),
    accountId: new Types.ObjectId(accountId),
  });

  if (!notification) {
    throw new AppError('Notification not found', httpStatus.NOT_FOUND);
  }

  return notification;
};

export const notification_services = {
  create_notification,
  create_many_notifications,
  get_my_notifications,
  get_notification_by_id,
  update_notification,
  mark_as_read,
  mark_all_as_read,
  delete_notification,
  get_unread_count,
  broadcast_announcement,
};
