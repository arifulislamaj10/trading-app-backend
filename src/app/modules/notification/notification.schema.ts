import { model, Schema, Types } from 'mongoose';

export type NotificationType =
  | 'new_signal'
  | 'subscription_active'
  | 'subscription_expiring'
  | 'subscription_canceled'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'system_announcement'
  | 'signal_copied'
  | 'trade_result_logged'
  | 'signal_closed'
  | 'badge_earned'
  | 'training_completed'
  | 'trading_unlocked'
  | 'signal_ai_reviewed'
  | 'signal_mt_pending';

export interface INotification {
  accountId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link: string;
  data: Record<string, unknown>;
}

const notificationSchema = new Schema<INotification>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'account', required: true },
    type: {
      type: String,
      enum: [
        'new_signal',
        'subscription_active',
        'subscription_expiring',
        'subscription_canceled',
        'payment_succeeded',
        'payment_failed',
        'system_announcement',
        'signal_copied',
        'trade_result_logged',
        'signal_closed',
        'badge_earned',
        'training_completed',
        'trading_unlocked',
        'signal_ai_reviewed',
        'signal_mt_pending',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    link: { type: String, default: '' },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

// Indexes for efficient queries
notificationSchema.index({ accountId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ accountId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

export const Notification_Model = model<INotification>('notification', notificationSchema);
