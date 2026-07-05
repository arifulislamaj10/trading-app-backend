import { z } from 'zod';

const isValidTimezone = (tz: string) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const audienceTypeEnum = z.enum([
  'ALL',
  'ROLE_USER',
  'ROLE_MASTER',
  'ROLE_ADMIN',
  'SUBSCRIPTION_TIER',
  'ACTIVE_SUBSCRIBERS',
  'FOLLOWERS_OF_MASTER',
]);

const subscriptionTierEnum = z.enum(['free', 'basic', 'pro', 'master']);

const audienceSchema = z
  .object({
    type: audienceTypeEnum,
    tier: subscriptionTierEnum.optional(),
    masterId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'SUBSCRIPTION_TIER' && !data.tier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'tier is required when audience type is SUBSCRIPTION_TIER',
        path: ['tier'],
      });
    }
    if (data.type === 'FOLLOWERS_OF_MASTER' && !data.masterId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'masterId is required when audience type is FOLLOWERS_OF_MASTER',
        path: ['masterId'],
      });
    }
  });

const update_subscription_plan = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  durationInDays: z.number().min(1).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const broadcast_announcement = z
  .object({
    title: z.string().min(1).max(255),
    message: z.string().min(1),
    link: z.string().url().optional().or(z.literal('')),
    audience: audienceSchema.optional(),
    targetRole: z.enum(['USER', 'MASTER', 'ADMIN']).optional(),
    role: z.enum(['USER', 'MASTER', 'ADMIN']).optional(),
    eventAt: z.string().datetime().optional(),
    eventTimezone: z.string().optional(),
    scheduledSendAt: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.eventAt && !data.eventTimezone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'eventTimezone is required when eventAt is provided',
        path: ['eventTimezone'],
      });
    }
    if (data.eventTimezone && !isValidTimezone(data.eventTimezone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid IANA timezone',
        path: ['eventTimezone'],
      });
    }
    if (data.scheduledSendAt) {
      const sendAt = new Date(data.scheduledSendAt);
      if (Number.isNaN(sendAt.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid scheduledSendAt date',
          path: ['scheduledSendAt'],
        });
      } else if (sendAt.getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'scheduledSendAt must be in the future',
          path: ['scheduledSendAt'],
        });
      }
    }
  });

export const admin_validations = {
  update_subscription_plan,
  broadcast_announcement,
};
