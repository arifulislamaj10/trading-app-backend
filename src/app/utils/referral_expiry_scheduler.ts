import cron from "node-cron";
import { Referral_Model } from "../modules/referral/referral.schema";
import logger from "../configs/logger";

const REFERRAL_PENDING_EXPIRY_DAYS = 90;

const expireStaleReferrals = async () => {
  const cutoff = new Date(
    Date.now() - REFERRAL_PENDING_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  const result = await Referral_Model.updateMany(
    { status: "PENDING", createdAt: { $lte: cutoff } },
    { $set: { status: "EXPIRED" } },
  );

  if (result.modifiedCount > 0) {
    logger.info(`⏰ Expired ${result.modifiedCount} stale pending referrals`);
  }
};

export const scheduleReferralExpiry = () => {
  cron.schedule("0 2 * * *", async () => {
    await expireStaleReferrals();
  });

  logger.info("📅 Referral expiry job scheduled (daily at 2:00 AM UTC)");
};
