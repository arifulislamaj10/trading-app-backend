import cron from 'node-cron';
import logger from '../configs/logger';
import { scheduled_announcement_services } from '../modules/notification/scheduled_announcement.service';

const executeAnnouncementJob = async () => {
  try {
    const result = await scheduled_announcement_services.process_due_announcements();

    if (result.processed > 0) {
      logger.info(
        `📅 Scheduled announcements processed: ${result.sent} sent, ${result.failed} failed, ${result.processed} total`
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`❌ Scheduled announcement job failed: ${message}`);
  }
};

export const scheduleAnnouncementDelivery = () => {
  cron.schedule('* * * * *', async () => {
    await executeAnnouncementJob();
  });

  logger.info('📅 Scheduled announcement delivery job registered (runs every minute)');
};
