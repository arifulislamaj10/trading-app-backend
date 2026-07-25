import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import {
  getMessaging,
  Messaging,
  BatchResponse,
  SendResponse,
} from 'firebase-admin/messaging';
import fs from 'fs';
import { configs } from '../configs';
import logger from '../configs/logger';

let app: App | null = null;
let initAttempted = false;

const initFirebase = (): boolean => {
  if (initAttempted) {
    return app !== null;
  }
  initAttempted = true;

  try {
    const existing = getApps();
    if (existing.length > 0) {
      app = existing[0];
      return true;
    }

    const { projectId, clientEmail, privateKey, serviceAccountPath } = configs.firebase;

    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      logger.info('🔥 Firebase Admin initialized from service account file');
      return true;
    }

    if (projectId && clientEmail && privateKey) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
      logger.info('🔥 Firebase Admin initialized from env credentials');
      return true;
    }

    logger.warn(
      '⚠️ Firebase Admin not configured — push notifications disabled (set FIREBASE_* env vars)'
    );
    return false;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`❌ Firebase Admin init failed: ${message}`);
    return false;
  }
};

export const isFcmEnabled = (): boolean => initFirebase();

const getFcmMessaging = (): Messaging | null => {
  if (!initFirebase() || !app) return null;
  return getMessaging(app);
};

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

/**
 * Send FCM messages to tokens. Returns invalid tokens to prune.
 */
export const sendFcmToTokens = async (
  tokens: string[],
  payload: PushPayload
): Promise<string[]> => {
  const messaging = getFcmMessaging();
  if (!messaging || tokens.length === 0) return [];

  const invalidTokens: string[] = [];
  const chunkSize = 500;

  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    try {
      const response: BatchResponse = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      });

      response.responses.forEach((res: SendResponse, index: number) => {
        if (!res.success) {
          const code = res.error?.code || '';
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            invalidTokens.push(chunk[index]);
          } else {
            logger.warn(`FCM send failed for token: ${code} — ${res.error?.message}`);
          }
        }
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ FCM multicast failed: ${message}`);
    }
  }

  return invalidTokens;
};
