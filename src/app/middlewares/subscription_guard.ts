import { Request, Response, NextFunction } from 'express';
import catchAsync from '../utils/catch_async';
import { AppError } from '../utils/app_error';
import httpStatus from 'http-status';
import { Account_Model } from '../modules/auth/auth.schema';
import { Subscription_Model } from '../modules/subscription/subscription.schema';
import { SubscriptionPlan_Model } from '../modules/subscription/subscription.plans';
import { Signal_Model } from '../modules/signal/signal.schema';
import { Types } from 'mongoose';

type SubscriptionTier = 'free' | 'basic' | 'pro' | 'master';

const tierLevels: Record<SubscriptionTier, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  master: 3,
};

/**
 * Increment signal usage for subscribers (skips admin/master).
 */
export const incrementSignalUsageForAccount = async (accountId: string) => {
  const account = await Account_Model.findById(accountId);
  if (!account || account.role === 'ADMIN' || account.role === 'MASTER') {
    return;
  }

  const subscription = await Subscription_Model.findOne({ accountId });
  if (!subscription) {
    return;
  }

  const plan = await SubscriptionPlan_Model.findOne({ planId: subscription.planId });
  if (plan && plan.signalLimit !== -1 && subscription.signalsUsed >= plan.signalLimit) {
    throw new AppError(
      'Signal limit reached. Upgrade your plan for unlimited access.',
      httpStatus.FORBIDDEN
    );
  }

  await Subscription_Model.findOneAndUpdate(
    { accountId },
    { $inc: { signalsUsed: 1 } }
  );
};

/**
 * Middleware to require an active subscription to view signals.
 * Only subscribed users with active/trialing status can access premium signals.
 * @param requiredTier - Minimum tier level required (defaults to 'basic' for premium signals)
 * @returns Express middleware
 */
export const requireActiveSubscription = (requiredTier?: SubscriptionTier) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const accountId = req.user!.userId;

    const account = await Account_Model.findById(accountId);
    if (!account) {
      throw new AppError('Account not found', httpStatus.NOT_FOUND);
    }

    // Admin and Master roles bypass subscription check
    if (account.role === 'ADMIN' || account.role === 'MASTER') {
      return next();
    }

    // Check subscription status on the account
    if (!account.subscriptionStatus || account.subscriptionStatus === 'none') {
      throw new AppError(
        'Active subscription required. Please subscribe to access premium signals.',
        httpStatus.FORBIDDEN
      );
    }

    // Check subscription is active or trialing
    if (!['active', 'trialing'].includes(account.subscriptionStatus)) {
      throw new AppError(
        'Your subscription is not active. Please renew to continue.',
        httpStatus.FORBIDDEN
      );
    }

    // Check if subscription has expired
    if (account.subscriptionExpiresAt && account.subscriptionExpiresAt < new Date()) {
      throw new AppError(
        'Your subscription has expired. Please renew to continue.',
        httpStatus.FORBIDDEN
      );
    }

    // Check tier level if required
    if (requiredTier) {
      const currentTier = (account.subscriptionTier || 'free') as SubscriptionTier;
      const currentLevel = tierLevels[currentTier];
      const requiredLevel = tierLevels[requiredTier];

      if (currentLevel < requiredLevel) {
        throw new AppError(
          `Upgrade to ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} plan to access this content`,
          httpStatus.FORBIDDEN
        );
      }
    }

    next();
  });
};

/**
 * Middleware to check and enforce signal usage limits.
 * If the user has reached their plan's signal limit, access is denied.
 * Increments the signal usage counter on successful access.
 */
export const enforceSignalLimit = () => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const accountId = req.user!.userId;

    // Admin and Master roles bypass signal limits
    const account = await Account_Model.findById(accountId);
    if (!account) {
      throw new AppError('Account not found', httpStatus.NOT_FOUND);
    }

    if (account.role === 'ADMIN' || account.role === 'MASTER') {
      return next();
    }

    // Free tier check
    if (account.subscriptionStatus === 'none' || account.subscriptionTier === 'free') {
      // Free tier: check if they've used their 3 signals
      const subscription = await Subscription_Model.findOne({ accountId });

      if (subscription) {
        const plan = await SubscriptionPlan_Model.findOne({ planId: subscription.planId });
        if (plan && plan.signalLimit !== -1 && subscription.signalsUsed >= plan.signalLimit) {
          throw new AppError(
            'You have reached your signal limit. Please upgrade your plan to continue.',
            httpStatus.FORBIDDEN
          );
        }

        // Increment usage
        await Subscription_Model.findOneAndUpdate(
          { accountId },
          { $inc: { signalsUsed: 1 } }
        );
      }
    }

    next();
  });
};

/**
 * Middleware to protect premium signal access.
 * Combines subscription check + signal limit enforcement.
 * Use this on routes that serve premium signal content.
 */
export const protectSignalAccess = (requiredTier: SubscriptionTier = 'basic') => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const accountId = req.user!.userId;

    // Admin and Master roles bypass
    const account = await Account_Model.findById(accountId);
    if (!account) {
      throw new AppError('Account not found', httpStatus.NOT_FOUND);
    }

    if (account.role === 'ADMIN' || account.role === 'MASTER') {
      return next();
    }

    // Check subscription
    if (!account.subscriptionStatus || !['active', 'trialing'].includes(account.subscriptionStatus)) {
      throw new AppError(
        'Active subscription required to view signals.',
        httpStatus.FORBIDDEN
      );
    }

    // Check tier
    const currentTier = (account.subscriptionTier || 'free') as SubscriptionTier;
    const currentLevel = tierLevels[currentTier];
    const requiredLevel = tierLevels[requiredTier];

    if (currentLevel < requiredLevel) {
      throw new AppError(
        `Upgrade to ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} plan to access this signal`,
        httpStatus.FORBIDDEN
      );
    }

    // Check and increment signal usage
    const subscription = await Subscription_Model.findOne({ accountId });
    if (subscription) {
      const plan = await SubscriptionPlan_Model.findOne({ planId: subscription.planId });

      if (plan && plan.signalLimit !== -1 && subscription.signalsUsed >= plan.signalLimit) {
        throw new AppError(
          'Signal limit reached. Upgrade your plan for unlimited access.',
          httpStatus.FORBIDDEN
        );
      }

      await Subscription_Model.findOneAndUpdate(
        { accountId },
        { $inc: { signalsUsed: 1 } }
      );
    }

    next();
  });
};

/**
 * Middleware: only Master Traders can access.
 */
export const requireMaster = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const account = await Account_Model.findById(req.user!.userId);

  if (!account) {
    throw new AppError('Account not found', httpStatus.NOT_FOUND);
  }

  if (account.role !== 'MASTER') {
    throw new AppError('Master Trader access required', httpStatus.FORBIDDEN);
  }

  next();
});

/**
 * Middleware: only Admin can access.
 */
export const requireAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const account = await Account_Model.findById(req.user!.userId);

  if (!account) {
    throw new AppError('Account not found', httpStatus.NOT_FOUND);
  }

  if (account.role !== 'ADMIN') {
    throw new AppError('Admin access required', httpStatus.FORBIDDEN);
  }

  next();
});
