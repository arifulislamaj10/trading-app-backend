import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Signal_Model } from '../src/app/modules/signal/signal.schema';
import { configs } from '../src/app/configs';

/**
 * One-time migration: convert legacy signal status 'closed' -> 'completed'.
 *
 * Context: 'closed' and 'completed' were aliases meaning the same thing
 * (a finished trade with a PnL result). The codebase now uses 'completed'
 * as the single canonical status, so existing 'closed' records must be
 * migrated to keep them counting in completed/win-rate stats.
 *
 * This script is idempotent — running it again after completion is a no-op.
 */
const connectDB = async () => {
  if (!configs.db_url) {
    throw new Error('DB_URL environment variable is required');
  }
  await mongoose.connect(configs.db_url);
  console.log('✅ Database connected');
};

const migrate = async () => {
  const before = await Signal_Model.countDocuments({ status: 'closed' as never });
  console.log(`🔎 Found ${before} signal(s) with status 'closed'`);

  if (before === 0) {
    console.log('✨ Nothing to migrate. Database is already up to date.');
    return;
  }

  const result = await Signal_Model.updateMany(
    { status: 'closed' as never },
    { $set: { status: 'completed' } }
  );

  console.log(`✅ Updated ${result.modifiedCount} signal(s) from 'closed' to 'completed'`);

  const remaining = await Signal_Model.countDocuments({ status: 'closed' as never });
  console.log(`🔁 Remaining 'closed' signals: ${remaining}`);
};

const main = async () => {
  try {
    await connectDB();
    await migrate();
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
    process.exit(0);
  } catch (error) {
    console.error('🚨 Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

main();
