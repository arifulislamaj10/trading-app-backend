import { Router } from 'express';
import { notification_controllers } from './notification.controller';
import auth from '../../middlewares/auth';

const notificationRouter = Router();

// All notification routes require authentication
notificationRouter.use(auth('USER', 'ADMIN', 'MASTER'));

// GET / - Get all notifications (empty body) or unread only (?isRead=true)
notificationRouter.get('/', notification_controllers.get_my_notifications);

// GET /unread-count - Get unread notification count
notificationRouter.get('/unread-count', notification_controllers.get_unread_count);

// GET /:id - Get single notification (must be after static paths)
notificationRouter.get('/:id', notification_controllers.get_notification_by_id);

// PATCH / - Mark all as read (body: { isRead: true }) or update single notification (/:id with body)
notificationRouter.patch('/', notification_controllers.update_notification);

// Backward compatibility: mark-all-read or mark specific ids
notificationRouter.patch('/mark-all-read', (req, res, next) => {
  const ids = req.body?.ids as string[] | undefined;

  if (Array.isArray(ids) && ids.length > 0) {
    (req.params as { id?: string }).id = ids[0];
    req.body = { isRead: true };
    return notification_controllers.update_notification(req, res, next);
  }

  (req.params as any).id = undefined;
  req.body = { isRead: true };
  return notification_controllers.update_notification(req, res, next);
});

// PATCH /:id - Update single notification
notificationRouter.patch('/:id', notification_controllers.update_notification);

// DELETE /:id - Delete a notification
notificationRouter.delete('/:id', notification_controllers.delete_notification);

export default notificationRouter;
