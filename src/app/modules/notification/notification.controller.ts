import catchAsync from '../../utils/catch_async';
import manageResponse from '../../utils/manage_response';
import { notification_services } from './notification.service';
import httpStatus from 'http-status';

const get_my_notifications = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const filters: { isRead?: boolean; type?: string } = {};
  if (req.query.isRead !== undefined) {
    filters.isRead = req.query.isRead === 'true';
  }
  if (req.query.type) {
    const typeValue = req.query.type;
    filters.type = Array.isArray(typeValue) ? String(typeValue[0]) : String(typeValue);
  }

  const result = await notification_services.get_my_notifications(accountId, page, limit, filters);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: req.query.isRead === 'true' ? 'Unread notifications retrieved' : 'Notifications retrieved',
    data: result.data,
    unreadCount: result.unreadCount,
    meta: result.meta,
  });
});

const get_notification_by_id = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await notification_services.get_notification_by_id(
    accountId,
    req.params.id as string
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Notification retrieved',
    data: result,
  });
});

const update_notification = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const notificationId = req.params.id as string | undefined;
  const body = req.body || {};
  const { isRead } = body;

  // If no ID provided and isRead is true, mark all as read
  if (!notificationId && isRead === true) {
    const result = await notification_services.mark_all_as_read(accountId);

    return manageResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'All notifications marked as read',
      data: result,
    });
  }

  // If no ID provided but body has data, return error
  if (!notificationId) {
    return manageResponse(res, {
      success: false,
      statusCode: httpStatus.BAD_REQUEST,
      message: 'Notification ID is required for single notification update',
      data: null,
    });
  }

  const result = await notification_services.update_notification(accountId, notificationId, { isRead });

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.isRead ? 'Notification marked as read' : 'Notification updated',
    data: result,
  });
});

const delete_notification = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await notification_services.delete_notification(accountId, req.params.id as string);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: null,
  });
});

const get_unread_count = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await notification_services.get_unread_count(accountId);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Unread count retrieved',
    data: result,
  });
});

export const notification_controllers = {
  get_my_notifications,
  get_notification_by_id,
  update_notification,
  delete_notification,
  get_unread_count,
};
