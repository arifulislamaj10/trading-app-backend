import { Router } from 'express';
import { notification_controllers } from './notification.controller';
import auth from '../../middlewares/auth';
import RequestValidator from '../../middlewares/request_validator';
import { device_validations } from './device.validation';

const notificationRouter = Router();

// All notification routes require authentication
notificationRouter.use(auth('USER', 'ADMIN', 'MASTER'));

// GET / - Get all notifications (empty body) or unread only (?isRead=true)
notificationRouter.get('/', notification_controllers.get_my_notifications);

// GET /unread-count - Get unread notification count
notificationRouter.get('/unread-count', notification_controllers.get_unread_count);

// Device tokens for FCM push
notificationRouter.post(
  '/device-token',
  RequestValidator(device_validations.registerDeviceSchema),
  notification_controllers.register_device_token
);
notificationRouter.delete(
  '/device-token',
  RequestValidator(device_validations.unregisterDeviceSchema),
  notification_controllers.unregister_device_token
);

// PATCH /read-all - Mark all unread notifications as read
notificationRouter.patch('/read-all', notification_controllers.mark_all_as_read);

// Backward compatibility: mark-all-read or mark specific ids
notificationRouter.patch('/mark-all-read', (req, res, next) => {
  const ids = req.body?.ids as string[] | undefined;

  if (Array.isArray(ids) && ids.length > 0) {
    (req.params as { id?: string }).id = ids[0];
    req.body = { isRead: true };
    return notification_controllers.update_notification(req, res, next);
  }

  return notification_controllers.mark_all_as_read(req, res, next);
});

// GET /:id - Get single notification (must be after static paths)
notificationRouter.get('/:id', notification_controllers.get_notification_by_id);

// PATCH /:id/read - Mark single notification as read
notificationRouter.patch('/:id/read', notification_controllers.mark_single_as_read);

// PATCH /:id - Update single notification
notificationRouter.patch('/:id', notification_controllers.update_notification);

// DELETE /:id - Delete a notification
notificationRouter.delete('/:id', notification_controllers.delete_notification);

export default notificationRouter;

