import { model, Schema, Types } from 'mongoose';

export type DevicePlatform = 'ios' | 'android' | 'web';

export interface IDeviceToken {
  accountId: Types.ObjectId;
  token: string;
  platform: DevicePlatform;
  createdAt?: Date;
  updatedAt?: Date;
}

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'account',
      required: true,
    },
    token: { type: String, required: true, trim: true },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      default: 'android',
    },
  },
  { versionKey: false, timestamps: true }
);

deviceTokenSchema.index({ token: 1 }, { unique: true });
deviceTokenSchema.index({ accountId: 1 });

export const Device_Token_Model = model<IDeviceToken>(
  'device_token',
  deviceTokenSchema
);
