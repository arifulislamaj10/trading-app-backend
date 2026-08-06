import cron from "node-cron";
import logger from "../configs/logger";
import { badge_services } from "../modules/badge/badge.service";
import { Master_Model } from "../modules/master/master.schema";

const executeBadgeEvaluationJob = async () => {
  try {
    await badge_services.evaluate_all_master_badges();

    const masters = await Master_Model.find().select("accountId");
    logger.info(
      `🏅 Master badge evaluation complete for ${masters.length} masters`,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Badge evaluation cron failed: ${message}`);
  }
};

/** Runs daily at 02:00 UTC — streaks, perfect week, leaderboard ranks. */
export const scheduleBadgeEvaluation = () => {
  cron.schedule("0 2 * * *", async () => {
    await executeBadgeEvaluationJob();
  });

  logger.info("🏅 Badge evaluation cron registered (daily at 02:00 UTC)");
};
