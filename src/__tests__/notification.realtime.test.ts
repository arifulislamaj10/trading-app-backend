import { notificationRealtime } from '../app/modules/notification/notification.realtime';
import type { Response } from 'express';

function mockRes() {
  const chunks: string[] = [];
  const res = {
    writableEnded: false,
    write: (chunk: string) => {
      chunks.push(chunk);
      return true;
    },
  } as unknown as Response;
  return { res, chunks };
}

describe('notification realtime SSE hub (BUG-006)', () => {
  it('delivers events only to subscribed account', () => {
    const a = mockRes();
    const b = mockRes();
    const unsubA = notificationRealtime.subscribe('user-a', a.res);
    const unsubB = notificationRealtime.subscribe('user-b', b.res);

    // clear connected handshake
    a.chunks.length = 0;
    b.chunks.length = 0;

    notificationRealtime.publish('user-a', {
      type: 'notification.created',
      payload: { notification: { _id: '1' } },
    });

    expect(a.chunks.join('')).toContain('notification.created');
    expect(a.chunks.join('')).toContain('"_id":"1"');
    expect(b.chunks.join('')).toBe('');

    unsubA();
    unsubB();
  });

  it('publishMany fans out to multiple accounts', () => {
    const a = mockRes();
    const b = mockRes();
    const unsubA = notificationRealtime.subscribe('acct-1', a.res);
    const unsubB = notificationRealtime.subscribe('acct-2', b.res);
    a.chunks.length = 0;
    b.chunks.length = 0;

    notificationRealtime.publishMany(['acct-1', 'acct-2'], {
      type: 'notification.created',
      payload: { bulk: true },
    });

    expect(a.chunks.join('')).toContain('notification.created');
    expect(b.chunks.join('')).toContain('notification.created');

    unsubA();
    unsubB();
  });
});
