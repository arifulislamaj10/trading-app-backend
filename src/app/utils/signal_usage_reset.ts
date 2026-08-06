import cron from "node-cron";
import { Subscription_Model } from "../modules/subscription/subscription.schema";
import logger from "../configs/logger";

/**
 * Reset signal usage for subscriptions whose billing cycle has ended.
 * Runs every hour to catch expired periods and reset signalsUsed to 0.
 * Only resets if currentPeriodEnd has passed and signalsUsed > 0.
 */
const resetExpiredSignalUsage = async () => {
  const now = new Date();

  // Find active subscriptions whose billing period has expired
  const expiredSubscriptions = await Subscription_Model.find({
    status: { $in: ["active", "trialing"] },
    currentPeriodEnd: { $lte: now },
    signalsUsed: { $gt: 0 },
  });

  if (expiredSubscriptions.length === 0) {
    return;
  }

  let resetCount = 0;
  let errorCount = 0;

  for (const sub of expiredSubscriptions) {
    try {
      await Subscription_Model.findByIdAndUpdate(sub._id, {
        signalsUsed: 0,
      });
      resetCount++;
      logger.info(
        `✅ Reset signal usage for subscription ${sub._id} (account: ${sub.accountId})`,
      );
    } catch (error: any) {
      errorCount++;
      logger.error(
        `❌ Failed to reset signal usage for subscription ${sub._id}: ${error.message}`,
      );
    }
  }

  logger.info(
    `🔄 Signal usage reset complete: ${resetCount} reset, ${errorCount} errors, ${expiredSubscriptions.length} total`,
  );
};

/**
 * Schedule: runs every hour at minute 0
 * Change cron expression if you need different frequency
 */
export const scheduleSignalUsageReset = () => {
  cron.schedule("0 * * * *", async () => {
    logger.info("⏰ Running signal usage reset job...");
    await resetExpiredSignalUsage();
  });

  logger.info("📅 Signal usage reset scheduled (every hour)");
};
