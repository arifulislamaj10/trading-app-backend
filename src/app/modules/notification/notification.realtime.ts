import { Response } from 'express';
import logger from '../../configs/logger';

export type NotificationRealtimeEvent = {
  type: 'notification.created' | 'notification.updated' | 'connected' | 'heartbeat';
  payload?: Record<string, unknown>;
};

type Client = {
  res: Response;
  accountId: string;
};

/**
 * In-process SSE hub for near real-time notification delivery.
 * Scales to multi-instance via sticky sessions or a future Redis pub/sub adapter.
 */
class NotificationRealtimeHub {
  private clients = new Map<string, Set<Client>>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private readonly heartbeatMs = 25_000;

  subscribe(accountId: string, res: Response): () => void {
    const client: Client = { res, accountId };
    let set = this.clients.get(accountId);
    if (!set) {
      set = new Set();
      this.clients.set(accountId, set);
    }
    set.add(client);
    this.ensureHeartbeat();

    this.write(client, { type: 'connected', payload: { accountId } });

    return () => {
      const current = this.clients.get(accountId);
      if (!current) return;
      current.delete(client);
      if (current.size === 0) {
        this.clients.delete(accountId);
      }
      if (this.clients.size === 0) {
        this.stopHeartbeat();
      }
    };
  }

  publish(accountId: string, event: NotificationRealtimeEvent): void {
    const set = this.clients.get(accountId);
    if (!set || set.size === 0) return;

    for (const client of [...set]) {
      const ok = this.write(client, event);
      if (!ok) {
        set.delete(client);
      }
    }

    if (set.size === 0) {
      this.clients.delete(accountId);
    }
  }

  publishMany(accountIds: string[], event: NotificationRealtimeEvent): void {
    const unique = new Set(accountIds);
    for (const accountId of unique) {
      this.publish(accountId, event);
    }
  }

  private write(client: Client, event: NotificationRealtimeEvent): boolean {
    try {
      if (client.res.writableEnded) return false;
      const data = JSON.stringify(event);
      client.res.write(`event: ${event.type}\n`);
      client.res.write(`data: ${data}\n\n`);
      return true;
    } catch (err: any) {
      logger.warn(`SSE write failed for ${client.accountId}: ${err?.message}`);
      return false;
    }
  }

  private ensureHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      for (const [accountId, set] of this.clients) {
        for (const client of [...set]) {
          const ok = this.write(client, { type: 'heartbeat' });
          if (!ok) set.delete(client);
        }
        if (set.size === 0) this.clients.delete(accountId);
      }
      if (this.clients.size === 0) this.stopHeartbeat();
    }, this.heartbeatMs);
    // Don't keep the process alive solely for heartbeats
    this.heartbeatTimer.unref?.();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const notificationRealtime = new NotificationRealtimeHub();
