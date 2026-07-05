import { Types } from 'mongoose';
import { AppError } from '../../utils/app_error';
import httpStatus from 'http-status';

export type AudienceType =
  | 'ALL'
  | 'ROLE_USER'
  | 'ROLE_MASTER'
  | 'ROLE_ADMIN'
  | 'SUBSCRIPTION_TIER'
  | 'ACTIVE_SUBSCRIBERS'
  | 'FOLLOWERS_OF_MASTER';

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'master';

export interface BroadcastAudience {
  type: AudienceType;
  tier?: SubscriptionTier;
  masterId?: string;
}

export interface BroadcastEventTime {
  eventAt: string;
  eventTimezone: string;
}

const ACTIVE_ACCOUNT_FILTER = {
  isDeleted: { $ne: true },
  accountStatus: { $ne: 'SUSPENDED' },
};

const roleFromAudienceType = (type: AudienceType): string | null => {
  switch (type) {
    case 'ROLE_USER':
      return 'USER';
    case 'ROLE_MASTER':
      return 'MASTER';
    case 'ROLE_ADMIN':
      return 'ADMIN';
    default:
      return null;
  }
};

/**
 * Map legacy targetRole (USER | MASTER | ADMIN) to audience object.
 */
export const audienceFromLegacyTargetRole = (targetRole?: string): BroadcastAudience => {
  if (!targetRole) {
    return { type: 'ALL' };
  }
  const map: Record<string, AudienceType> = {
    USER: 'ROLE_USER',
    MASTER: 'ROLE_MASTER',
    ADMIN: 'ROLE_ADMIN',
  };
  return { type: map[targetRole] ?? 'ALL' };
};

/**
 * Resolve recipient account IDs for a broadcast audience.
 */
export const resolveAudienceRecipients = async (
  audience: BroadcastAudience
): Promise<string[]> => {
  const { Account_Model } = await import('../auth/auth.schema');

  const filterActiveAccounts = async (accountIds: string[]): Promise<string[]> => {
    if (accountIds.length === 0) return [];
    const uniqueIds = [...new Set(accountIds)];
    const accounts = await Account_Model.find({
      _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) },
      ...ACTIVE_ACCOUNT_FILTER,
    }).select('_id');
    return accounts.map((a) => a._id.toString());
  };

  switch (audience.type) {
    case 'ALL': {
      const accounts = await Account_Model.find(ACTIVE_ACCOUNT_FILTER).select('_id');
      return accounts.map((a) => a._id.toString());
    }

    case 'ROLE_USER':
    case 'ROLE_MASTER':
    case 'ROLE_ADMIN': {
      const role = roleFromAudienceType(audience.type);
      const accounts = await Account_Model.find({
        role,
        ...ACTIVE_ACCOUNT_FILTER,
      }).select('_id');
      return accounts.map((a) => a._id.toString());
    }

    case 'SUBSCRIPTION_TIER': {
      if (!audience.tier) {
        throw new AppError('tier is required for SUBSCRIPTION_TIER audience', httpStatus.BAD_REQUEST);
      }
      const accounts = await Account_Model.find({
        subscriptionTier: audience.tier,
        ...ACTIVE_ACCOUNT_FILTER,
      }).select('_id');
      return accounts.map((a) => a._id.toString());
    }

    case 'ACTIVE_SUBSCRIBERS': {
      const { Subscription_Model } = await import('../subscription/subscription.schema');
      const subs = await Subscription_Model.find({ status: 'active' }).select('accountId');
      const accountIds = subs.map((s) => s.accountId.toString());
      return filterActiveAccounts(accountIds);
    }

    case 'FOLLOWERS_OF_MASTER': {
      if (!audience.masterId || !Types.ObjectId.isValid(audience.masterId)) {
        throw new AppError('Valid masterId is required for FOLLOWERS_OF_MASTER audience', httpStatus.BAD_REQUEST);
      }
      const { Follow_Model } = await import('../follow/follow.schema');
      const follows = await Follow_Model.find({
        masterId: new Types.ObjectId(audience.masterId),
      }).select('followerId');
      const accountIds = follows.map((f) => f.followerId.toString());
      return filterActiveAccounts(accountIds);
    }

    default:
      throw new AppError('Invalid audience type', httpStatus.BAD_REQUEST);
  }
};
