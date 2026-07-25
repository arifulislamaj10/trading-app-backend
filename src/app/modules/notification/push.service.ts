import { Types } from 'mongoose';
import logger from '../../configs/logger';
import { isFcmEnabled, sendFcmToTokens } from '../../utils/fcm';
import { Device_Token_Model, DevicePlatform } from './device_token.schema';

const toStringData = (
  data: Record<string, unknown> | undefined,
  extras: Record<string, string>
): Record<string, string> => {
  const result: Record<string, string> = { ...extras };
  if (!data) return result;

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    result[key] = typeof value === 'string' ? value : String(value);
  }
  return result;
};

const pruneInvalidTokens = async (tokens: string[]) => {
  if (tokens.length === 0) return;
  await Device_Token_Model.deleteMany({ token: { $in: tokens } });
  logger.info(`🧹 Pruned ${tokens.length} invalid FCM device tokens`);
};

const send_push_to_account = async (
  accountId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) => {
  if (!isFcmEnabled()) return;

  try {
    const devices = await Device_Token_Model.find({
      accountId: new Types.ObjectId(accountId),
    }).select('token');

    if (devices.length === 0) return;

    const tokens = devices.map((d) => d.token);
    const payloadData = toStringData(data, {
      type: typeof data?.type === 'string' ? data.type : '',
      link: typeof data?.link === 'string' ? data.link : '',
    });

    if (data?.signalId != null) {
      payloadData.signalId = String(data.signalId);
    }

    const invalid = await sendFcmToTokens(tokens, {
      title,
      body,
      data: payloadData,
    });
    await pruneInvalidTokens(invalid);
  } catch (error: any) {
    logger.error(`❌ Push to account ${accountId} failed: ${error.message}`);
  }
};

const send_push_to_accounts = async (
  items: Array<{
    accountId: string;
    title: string;
    message: string;
    link?: string;
    type?: string;
    data?: Record<string, unknown>;
  }>
) => {
  if (!isFcmEnabled() || items.length === 0) return;

  // Group by identical payload to reduce fan-out complexity for bulk
  for (const item of items) {
    await send_push_to_account(item.accountId, item.title, item.message, {
      ...(item.data || {}),
      type: item.type || '',
      link: item.link || '',
    });
  }
};

const register_device_token = async (
  accountId: string,
  token: string,
  platform: DevicePlatform = 'android'
) => {
  const existing = await Device_Token_Model.findOne({ token });
  if (existing) {
    existing.accountId = new Types.ObjectId(accountId);
    existing.platform = platform;
    await existing.save();
    return existing;
  }

  return Device_Token_Model.create({
    accountId: new Types.ObjectId(accountId),
    token,
    platform,
  });
};

const unregister_device_token = async (accountId: string, token: string) => {
  await Device_Token_Model.deleteOne({
    accountId: new Types.ObjectId(accountId),
    token,
  });
  return { message: 'Device token removed' };
};

export const push_services = {
  send_push_to_account,
  send_push_to_accounts,
  register_device_token,
  unregister_device_token,
};
