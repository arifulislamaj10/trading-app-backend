import cron from "node-cron";
import { signal_services } from "../modules/signal/signal.service";
import logger from "../configs/logger";

/**
 * Publish scheduled signals whose scheduled time has arrived.
 * Runs every minute to check and publish signals that have reached their scheduled time.
 */
const executePublishJob = async () => {
  try {
    const result = await signal_services.publish_scheduled_signals();

    if (result.total && result.total > 0) {
      logger.info(
        `⏰ Scheduled signal publish complete: ${result.published} published, ${result.notified} notifications sent, ${result.errors} errors, ${result.total} total`,
      );
    } else {
      logger.info("📅 Signal publish check: no signals due");
    }
  } catch (error: any) {
    logger.error(
      `❌ Failed to execute scheduled publish job: ${error.message}`,
    );
  }
};

/**
 * Schedule: runs every minute
 * This ensures signals are published promptly (within 1 minute of scheduled time)
 */
export const scheduleSignalPublish = () => {
  cron.schedule("* * * * *", async () => {
    await executePublishJob();
  });

  logger.info("📅 Scheduled signal publish job registered (runs every minute)");
};
