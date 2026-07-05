import catchAsync from '../../utils/catch_async';
import manageResponse from '../../utils/manage_response';
import httpStatus from 'http-status';
import { AppError } from '../../utils/app_error';
import { Account_Model } from '../auth/auth.schema';
import { Subscription_Model } from '../subscription/subscription.schema';
import { Payment_Model } from '../subscription/payment.schema';
import { SubscriptionPlan_Model } from '../subscription/subscription.plans';
import { stripeService } from '../subscription/stripe.service';
import { Signal_Model } from '../signal/signal.schema';
import { Master_Model } from '../master/master.schema';
import { Follow_Model } from '../follow/follow.schema';
import { Notification_Model } from '../notification/notification.schema';
import { Referral_Model } from '../referral/referral.schema';
import { notification_services } from '../notification/notification.service';

// Platform analytics (Admin only)
const get_platform_analytics = catchAsync(async (req, res) => {
  const totalUsers = await Account_Model.countDocuments({ role: 'USER' });
  const totalMasters = await Account_Model.countDocuments({ role: 'MASTER' });
  const activeSubscriptions = await Subscription_Model.countDocuments({ status: 'active' });
  const totalSignals = await Signal_Model.countDocuments();
  const activeSignals = await Signal_Model.countDocuments({ status: 'active' });
  const totalFollows = await Follow_Model.countDocuments();

  // Referral stats for analytics
  const totalReferrals = await Referral_Model.countDocuments();
  const activeReferrals = await Referral_Model.countDocuments({ status: 'COMPLETED' });
  const totalRewards = await Referral_Model.aggregate([
    { $group: { _id: null, total: { $sum: '$rewardAmount' } } },
  ]);

  // Revenue stats
  const totalRevenue = await Payment_Model.aggregate([
    { $match: { status: 'succeeded' } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  // Recent subscriptions
  const recentSubscriptions = await Subscription_Model.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('accountId', 'name email');

  // Subscription distribution
  const subscriptionByTier = await Subscription_Model.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$planId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Platform analytics retrieved',
    data: {
      users: { total: totalUsers },
      masters: {
        total: totalMasters,
      },
      subscriptions: {
        active: activeSubscriptions,
        byTier: subscriptionByTier,
      },
      signals: {
        total: totalSignals,
        active: activeSignals,
      },
      follows: { total: totalFollows },
      referrals: {
        total: totalReferrals,
        active: activeReferrals,
        totalRewards: totalRewards[0]?.total || 0,
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        transactionCount: totalRevenue[0]?.count || 0,
      },
      recentSubscriptions,
    },
  });
});

// Global Referral Stats (Admin)
const get_referral_stats = catchAsync(async (req, res) => {
  const totalReferrals = await Referral_Model.countDocuments();
  const activeReferrals = await Referral_Model.countDocuments({ status: 'COMPLETED' });
  
  const totalRewardsDistributed = await Referral_Model.aggregate([
    { $group: { _id: null, total: { $sum: '$rewardAmount' } } },
  ]);

  // Get Top Referrers
  const topReferrers = await Referral_Model.aggregate([
    { $match: { status: 'COMPLETED' } },
    { $group: { 
        _id: '$referrerId', 
        count: { $sum: 1 },
        rewards: { $sum: '$rewardAmount' }
      } 
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'accounts',
        localField: '_id',
        foreignField: '_id',
        as: 'referrer'
      }
    },
    { $unwind: '$referrer' },
    {
      $project: {
        name: '$referrer.name',
        count: 1,
        rewards: 1
      }
    }
  ]);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Global referral stats retrieved',
    data: {
      totalReferrals,
      activeReferrals,
      totalRewardsDistributed: totalRewardsDistributed[0]?.total || 0,
      topReferrers
    },
  });
});

// Get all referrals (Admin)
const get_all_referrals = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Handle search (referrer or invitee name)
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search as string, 'i');
    const matchedUsers = await Account_Model.find({ 
      name: { $regex: searchRegex } 
    }).select('_id');
    const userIds = matchedUsers.map(u => u._id);
    
    query.$or = [
      { referrerId: { $in: userIds } },
      { inviteeId: { $in: userIds } }
    ];
  }

  const referrals = await Referral_Model.find(query)
    .populate('referrerId', 'name')
    .populate('inviteeId', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Referral_Model.countDocuments(query);

  const data = referrals.map(ref => ({
    _id: ref._id,
    referrerName: (ref.referrerId as any)?.name || 'Unknown',
    inviteeName: (ref.inviteeId as any)?.name || 'Unknown',
    status: ref.status,
    rewardAmount: ref.rewardAmount,
    createdAt: ref.createdAt,
  }));

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All referrals retrieved',
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// Broadcast announcement
const broadcast_announcement = catchAsync(async (req, res) => {
  const {
    title,
    message,
    link,
    audience,
    targetRole,
    role,
    eventAt,
    eventTimezone,
    scheduledSendAt,
  } = req.body;

  const legacyTargetRole = targetRole ?? role;
  const eventTime =
    eventAt && eventTimezone ? { eventAt, eventTimezone } : undefined;

  const { audienceFromLegacyTargetRole } = await import(
    '../notification/notification.audience'
  );
  const resolvedAudience =
    audience ?? audienceFromLegacyTargetRole(legacyTargetRole);

  if (scheduledSendAt) {
    const { scheduled_announcement_services } = await import(
      '../notification/scheduled_announcement.service'
    );

    const result = await scheduled_announcement_services.schedule_announcement({
      title,
      message,
      link,
      audience: resolvedAudience,
      eventTime,
      scheduledSendAt: new Date(scheduledSendAt),
      createdBy: req.user!.userId,
    });

    manageResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Announcement scheduled successfully',
      data: { ...result, scheduled: true },
    });
    return;
  }

  const result = await notification_services.broadcast_announcement(
    title,
    message,
    link,
    resolvedAudience,
    legacyTargetRole,
    eventTime
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Announcement sent to ${result.sentCount} users`,
    data: { ...result, scheduled: false },
  });
});

// Manage user role (Admin can promote/demote)
const change_user_role = catchAsync(async (req, res) => {
  const { userId, newRole } = req.body;

  const account = await Account_Model.findByIdAndUpdate(
    userId,
    { role: newRole},
    { new: true }
  ).select('-password -twoFactorSecret -twoFactorBackupCodes -verificationCode -verificationCodeExpires -resetPasswordCode -resetPasswordExpire -lockedUntil');

  if (!account) {
    manageResponse(res, {
      success: false,
      statusCode: httpStatus.NOT_FOUND,
      message: 'User not found',
      data: null,
    });
    return;
  }

  // Auto-create Master Profile when promoting to MASTER role
  if (newRole === 'MASTER') {
    const existingMasterProfile = await Master_Model.findOne({ accountId: userId });
    
    if (!existingMasterProfile) {
      await Master_Model.create({
        accountId: userId,
        bio: '',
        specialties: [],
        yearsOfExperience: 0,
        isApproved: true,
        approvedAt: new Date(),
        totalSignals: 0,
        winningSignals: 0,
        losingSignals: 0,
        winRate: 0,
        avgPnl: 0,
        followerCount: 0,
        isFeatured: false,
      });
    }
  }

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `User role changed to ${newRole}`,
    data: account,
  });
});

// Get payment logs (Admin view all payments)
const get_all_payments = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (req.query.status) {
    query.status = req.query.status;
  }

  const payments = await Payment_Model.find(query)
    .populate('accountId', 'name email')
    .populate('subscriptionId', 'planId status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Payment_Model.countDocuments(query);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Payment logs retrieved',
    data: payments,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// Update Subscription Plan (Admin)
const update_subscription_plan = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, price, durationInDays, features, isActive } = req.body;

  // Find existing plan first to check current price and stripeProductId
  const existingPlan = await SubscriptionPlan_Model.findById(id);
  if (!existingPlan) {
    manageResponse(res, {
      success: false,
      statusCode: httpStatus.NOT_FOUND,
      message: 'Subscription plan not found',
      data: null,
    });
    return;
  }

  const updateData: Record<string, any> = {};
  if (name !== undefined) updateData.name = name;
  if (durationInDays !== undefined) updateData.durationInDays = durationInDays;
  if (features !== undefined) updateData.features = features;
  if (isActive !== undefined) updateData.isActive = isActive;

  // Real-time Stripe Price Sync
  if (price !== undefined && price !== existingPlan.price) {
    updateData.price = price;
    
    // If the plan is already synced to Stripe, update the price there too
    if (existingPlan.stripeProductId && existingPlan.syncedToStripe) {
      try {
        const newStripePrice = await stripeService.createPrice(
          existingPlan.stripeProductId,
          price * 100, // Stripe expects amount in cents
          existingPlan.currency || 'usd',
          existingPlan.interval
        );
        
        updateData.stripePriceId = newStripePrice.id;
        console.log(`✅ Stripe Price updated for plan ${existingPlan.planId}: ${newStripePrice.id}`);
      } catch (error: any) {
        console.error(`❌ Failed to update Stripe price for plan ${existingPlan.planId}:`, error.message);
        // We might want to decide if we fail the whole request or just log the error
        // For now, let's throw an error to ensure consistency
        throw new AppError(`Stripe sync failed: ${error.message}`, httpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  const plan = await SubscriptionPlan_Model.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Subscription plan updated successfully',
    data: plan,
  });
});

// Get all subscribers (Admin)
const get_all_subscribers = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (req.query.status) {
    query.status = req.query.status;
  }

  const subscribers = await Subscription_Model.find(query)
    .populate('accountId', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Subscription_Model.countDocuments(query);

  // Get plan names for all planIds in the current page
  const planIds = [...new Set(subscribers.map((s) => s.planId))];
  const plans = await SubscriptionPlan_Model.find({ planId: { $in: planIds } });
  
  const planMap = plans.reduce((acc, plan) => {
    acc[plan.planId] = plan.name;
    return acc;
  }, {} as Record<string, string>);

  const data = subscribers.map((sub: any) => ({
    userId: sub.accountId?._id,
    userInfo: sub.accountId,
    planId: sub.planId,
    planName: planMap[sub.planId] || sub.planId,
    startDate: sub.currentPeriodStart,
    endDate: sub.currentPeriodEnd,
    status: sub.status,
  }));

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All subscribers retrieved',
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});


const get_referral_by_id = catchAsync(async (req, res) => {
  const { id } = req.params;
  const referral = await Referral_Model.findById(id)
    .populate('referrerId', 'name email')
    .populate('inviteeId', 'name email');

  if (!referral) {
    manageResponse(res, {
      success: false,
      statusCode: httpStatus.NOT_FOUND,
      message: 'Referral not found',
      data: null,
    });
    return;
  }

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Referral retrieved',
    data: referral,
  });
});

const get_user_referrals = catchAsync(async (req, res) => {
  const { id } = req.params; // userId
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const query = { referrerId: id };

  const referrals = await Referral_Model.find(query)
    .populate('inviteeId', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Referral_Model.countDocuments(query);

  const data = referrals.map(ref => ({
    _id: ref._id,
    inviteeName: (ref.inviteeId as any)?.name || 'Unknown',
    status: ref.status,
    rewardAmount: ref.rewardAmount,
    createdAt: ref.createdAt,
  }));

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User referrals retrieved',
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const admin_controllers = {
  get_platform_analytics,
  broadcast_announcement,
  change_user_role,
  get_all_payments,
  update_subscription_plan,
  get_all_subscribers,
  get_referral_by_id, 
  get_user_referrals,
  get_referral_stats,
  get_all_referrals,
};
