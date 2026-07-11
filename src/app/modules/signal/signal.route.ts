import { Router } from 'express';
import { signal_controllers } from './signal.controller';
import { signal_validations } from './signal.validation';
import auth, { optionalAuth } from '../../middlewares/auth';
import RequestValidator from '../../middlewares/request_validator';
import { aiLimiter } from '../../middlewares/rate_limiter';

const signalRouter = Router();

// Public routes
signalRouter.get('/', optionalAuth, signal_controllers.get_all_signals);

// Master-only routes (defined before parameterized /:id)
signalRouter.get('/my/signals', auth('MASTER'), signal_controllers.get_my_signals);
signalRouter.get('/review-queue', auth('MASTER'), signal_controllers.get_review_queue);
signalRouter.post(
  '/',
  auth('MASTER', 'ADMIN'),
  aiLimiter,
  RequestValidator(signal_validations.createSignalSchema),
  signal_controllers.create_signal,
);

signalRouter.post(
  '/from-json',
  auth('MASTER', 'ADMIN'),
  aiLimiter,
  RequestValidator(signal_validations.createSignalFromJsonSchema),
  signal_controllers.create_signal_from_json,
);

signalRouter.post(
  '/from-json/ai-extract',
  auth('MASTER', 'ADMIN'),
  aiLimiter,
  RequestValidator(signal_validations.extractSignalFromJsonSchema),
  signal_controllers.create_signal_from_loose_json,
);

signalRouter.post(
  '/:id/confirm',
  auth('MASTER', 'ADMIN'),
  signal_controllers.confirm_signal,
);
signalRouter.post(
  '/:id/reject',
  auth('MASTER', 'ADMIN'),
  RequestValidator(signal_validations.rejectSignalSchema),
  signal_controllers.reject_signal,
);
signalRouter.post(
  '/:id/resubmit-ai',
  auth('MASTER'),
  aiLimiter,
  signal_controllers.resubmit_ai_validation,
);
signalRouter.post(
  '/:id/ai-assist',
  auth('MASTER'),
  aiLimiter,
  signal_controllers.ai_assist_signal,
);

// Parameterized routes
signalRouter.get('/:id', optionalAuth, signal_controllers.get_single_signal);
signalRouter.patch(
  '/:id',
  auth('MASTER', 'ADMIN'),
  RequestValidator(signal_validations.updateSignalSchema),
  signal_controllers.update_signal,
);
signalRouter.delete('/:id', auth('MASTER', 'ADMIN'), signal_controllers.delete_signal);

// Engagement routes (authenticated users)
signalRouter.post('/:id/like', auth('ADMIN', 'USER', 'MASTER'), signal_controllers.like_signal);
signalRouter.delete('/:id/like', auth('ADMIN', 'USER', 'MASTER'), signal_controllers.unlike_signal);
signalRouter.post('/:id/bookmark', auth('ADMIN', 'USER', 'MASTER'), signal_controllers.bookmark_signal);
signalRouter.delete('/:id/bookmark', auth('ADMIN', 'USER', 'MASTER'), signal_controllers.unbookmark_signal);
signalRouter.post('/:id/share', auth('ADMIN', 'USER', 'MASTER'), signal_controllers.share_signal);

// Admin routes
signalRouter.patch('/featured/:id', auth('ADMIN'), signal_controllers.toggle_featured);

export default signalRouter;
