import { z } from 'zod';

export const registerDeviceSchema = z.object({
  token: z.string().min(10, 'FCM token is required'),
  platform: z.enum(['ios', 'android', 'web']).default('android').optional(),
});

export const unregisterDeviceSchema = z.object({
  token: z.string().min(10, 'FCM token is required'),
});

export const device_validations = {
  registerDeviceSchema,
  unregisterDeviceSchema,
};
