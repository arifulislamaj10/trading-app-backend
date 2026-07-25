import catchAsync from '../../utils/catch_async';
import manageResponse from '../../utils/manage_response';
import { notification_services } from './notification.service';
import { push_services } from './push.service';
import httpStatus from 'http-status';

const enrichNotification = (notification: any) => {
  const obj = typeof notification.toObject === 'function' ? notification.toObject() : notification;
  const data = obj.data || {};

  // Extract signalId from data or link if not directly present
  let signalId = data.signalId || obj.signalId || null;
  if (!signalId && obj.link) {
    const match = obj.link.match(/\/signals\/([a-fA-F0-9]{24})/);
    if (match) {
      signalId = match[1];
    }
  }

  const enrichedData = {
    signalId: signalId ? String(signalId) : null,
    symbol: data.symbol || null,
    signalType: data.signalType || null,
    badgeKey: data.badgeKey || null,
    badgeName: data.badgeName || null,
    ...data,
  };

  // Map backend notification types to client types
  let type = obj.type;
  if (type === 'new_signal') type = 'signal_published';
  else if (type === 'trade_result_logged') type = 'trade_update';
  else if (type === 'badge_earned') type = 'badge';

  return {
    _id: obj._id,
    type,
    title: obj.title,
    message: obj.message,
    isRead: obj.isRead,
    link: obj.link,
    data: enrichedData,
    createdAt: obj.createdAt,
  };
};

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
  const enrichedData = result.data.map(enrichNotification);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: req.query.isRead === 'true' ? 'Unread notifications retrieved' : 'Notifications retrieved',
    data: enrichedData,
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
    data: enrichNotification(result),
  });
});

const mark_single_as_read = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await notification_services.update_notification(accountId, req.params.id as string, { isRead: true });

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Notification marked as read',
    data: {
      _id: result._id,
      isRead: result.isRead,
    },
  });
});

const mark_all_as_read = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await notification_services.mark_all_as_read(accountId);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All notifications marked as read',
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

const register_device_token = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const { token, platform } = req.body;
  const result = await push_services.register_device_token(
    accountId,
    token,
    platform || 'android'
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Device token registered',
    data: result,
  });
});

const unregister_device_token = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const { token } = req.body;
  const result = await push_services.unregister_device_token(accountId, token);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: null,
  });
});

export const notification_controllers = {
  get_my_notifications,
  get_notification_by_id,
  mark_single_as_read,
  mark_all_as_read,
  update_notification,
  delete_notification,
  get_unread_count,
  register_device_token,
  unregister_device_token,
};

