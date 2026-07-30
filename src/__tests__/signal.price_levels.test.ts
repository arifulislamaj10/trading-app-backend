import {
  createSignalSchema,
  refineSignalPriceLevels,
  SIGNAL_OUTCOMES,
} from '../app/modules/signal/signal.validation';
import { z } from 'zod';

describe('signal price level validation (BUG-001–004)', () => {
  const base = {
    title: 'EURUSD Setup',
    assetType: 'forex' as const,
    symbol: 'EURUSD',
    timeframe: 'h1' as const,
    entryPrice: 1.1,
    publishType: 'instant' as const,
  };

  describe('short signals', () => {
    it('rejects stop loss <= entry price', async () => {
      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: 'short',
          stopLoss: 1.1,
          takeProfit1: 1.05,
        })
      ).rejects.toThrow();

      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: 'short',
          stopLoss: 1.09,
          takeProfit1: 1.05,
        })
      ).rejects.toThrow();
    });

    it('rejects target >= entry price', async () => {
      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: 'short',
          stopLoss: 1.15,
          takeProfit1: 1.1,
        })
      ).rejects.toThrow();

      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: 'short',
          stopLoss: 1.15,
          takeProfit1: 1.12,
        })
      ).rejects.toThrow();
    });

    it('accepts stop loss > entry and target < entry', async () => {
      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: 'short',
          stopLoss: 1.15,
          takeProfit1: 1.05,
          takeProfit2: 1.02,
        })
      ).resolves.toMatchObject({
        signalType: 'short',
        stopLoss: 1.15,
        takeProfit1: 1.05,
      });
    });
  });

  describe('long signals', () => {
    it('rejects stop loss >= entry price', async () => {
      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: 'long',
          stopLoss: 1.1,
          takeProfit1: 1.15,
        })
      ).rejects.toThrow();

      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: 'long',
          stopLoss: 1.12,
          takeProfit1: 1.15,
        })
      ).rejects.toThrow();
    });

    it('rejects target <= entry price', async () => {
      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: 'long',
          stopLoss: 1.05,
          takeProfit1: 1.1,
        })
      ).rejects.toThrow();

      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: 'long',
          stopLoss: 1.05,
          takeProfit1: 1.08,
        })
      ).rejects.toThrow();
    });

    it('accepts stop loss < entry and target > entry', async () => {
      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: 'long',
          stopLoss: 1.05,
          takeProfit1: 1.15,
        })
      ).resolves.toMatchObject({
        signalType: 'long',
        stopLoss: 1.05,
        takeProfit1: 1.15,
      });
    });
  });

  it('skips checks when SL/TP are omitted', async () => {
    await expect(
      createSignalSchema.parseAsync({
        ...base,
        signalType: 'long',
      })
    ).resolves.toMatchObject({ signalType: 'long', entryPrice: 1.1 });
  });

  it('refineSignalPriceLevels adds issues with expected messages', () => {
    const issues: z.ZodIssue[] = [];
    const ctx = {
      addIssue: (issue: z.ZodIssue) => {
        issues.push(issue);
      },
      path: [] as (string | number)[],
    } as unknown as z.RefinementCtx;

    refineSignalPriceLevels(
      { signalType: 'short', entryPrice: 100, stopLoss: 90, takeProfit1: 110 },
      ctx
    );

    expect(issues.map((i) => i.message)).toEqual(
      expect.arrayContaining([
        'For short signals, stop loss must be greater than entry price',
        'For short signals, target must be less than entry price',
      ])
    );
  });
});

describe('signal outcome constants (BUG-005)', () => {
  it('defines pending / hit_target / stopped_out / cancelled', () => {
    expect(SIGNAL_OUTCOMES).toEqual([
      'pending',
      'hit_target',
      'stopped_out',
      'cancelled',
    ]);
  });
});
