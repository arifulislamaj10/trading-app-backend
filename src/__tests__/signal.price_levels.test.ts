import {
  createSignalSchema,
  isProvidedPrice,
  refineSignalPriceLevels,
  SIGNAL_OUTCOMES,
} from "../app/modules/signal/signal.validation";
import { z } from "zod";

describe("signal price level validation (BUG-001–004)", () => {
  const base = {
    title: "EURUSD Setup",
    assetType: "forex" as const,
    symbol: "EURUSD",
    timeframe: "h1" as const,
    entryPrice: 1.1,
    publishType: "instant" as const,
  };

  const collectRefineIssues = (data: {
    signalType?: "long" | "short";
    entryPrice?: number;
    stopLoss?: number | null;
    takeProfit1?: number | null;
    takeProfit2?: number | null;
    takeProfit3?: number | null;
  }) => {
    const issues: z.ZodIssue[] = [];
    const ctx = {
      addIssue: (issue: z.ZodIssue) => {
        issues.push(issue);
      },
      path: [] as (string | number)[],
    } as unknown as z.RefinementCtx;
    refineSignalPriceLevels(data, ctx);
    return issues;
  };

  describe("isProvidedPrice", () => {
    it("rejects null, undefined, NaN, and <= 0 placeholders", () => {
      expect(isProvidedPrice(null)).toBe(false);
      expect(isProvidedPrice(undefined)).toBe(false);
      expect(isProvidedPrice(NaN)).toBe(false);
      expect(isProvidedPrice(0)).toBe(false);
      expect(isProvidedPrice(-1)).toBe(false);
    });

    it("accepts positive finite prices", () => {
      expect(isProvidedPrice(0.01)).toBe(true);
      expect(isProvidedPrice(1.1)).toBe(true);
    });
  });

  describe("short signals", () => {
    it("rejects stop loss <= entry price", async () => {
      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: "short",
          stopLoss: 1.1,
          takeProfit1: 1.05,
        }),
      ).rejects.toThrow();

      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: "short",
          stopLoss: 1.09,
          takeProfit1: 1.05,
        }),
      ).rejects.toThrow();
    });

    it("rejects target >= entry price", async () => {
      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: "short",
          stopLoss: 1.15,
          takeProfit1: 1.1,
        }),
      ).rejects.toThrow();

      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: "short",
          stopLoss: 1.15,
          takeProfit1: 1.12,
        }),
      ).rejects.toThrow();
    });

    it("accepts stop loss > entry and target < entry", async () => {
      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: "short",
          stopLoss: 1.15,
          takeProfit1: 1.05,
          takeProfit2: 1.02,
        }),
      ).resolves.toMatchObject({
        signalType: "short",
        stopLoss: 1.15,
        takeProfit1: 1.05,
      });
    });
  });

  describe("long signals", () => {
    it("rejects stop loss >= entry price", async () => {
      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: "long",
          stopLoss: 1.1,
          takeProfit1: 1.15,
        }),
      ).rejects.toThrow();

      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: "long",
          stopLoss: 1.12,
          takeProfit1: 1.15,
        }),
      ).rejects.toThrow();
    });

    it("rejects target <= entry price", async () => {
      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: "long",
          stopLoss: 1.05,
          takeProfit1: 1.1,
        }),
      ).rejects.toThrow();

      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: "long",
          stopLoss: 1.05,
          takeProfit1: 1.08,
        }),
      ).rejects.toThrow();
    });

    it("accepts stop loss < entry and target > entry", async () => {
      await expect(
        createSignalSchema.parseAsync({
          ...base,
          signalType: "long",
          stopLoss: 1.05,
          takeProfit1: 1.15,
        }),
      ).resolves.toMatchObject({
        signalType: "long",
        stopLoss: 1.05,
        takeProfit1: 1.15,
      });
    });
  });

  it("skips checks when SL/TP are omitted", async () => {
    await expect(
      createSignalSchema.parseAsync({
        ...base,
        signalType: "long",
      }),
    ).resolves.toMatchObject({ signalType: "long", entryPrice: 1.1 });
  });

  it("refine skips placeholder stopLoss 0 and omitted targets (no geometry issues)", () => {
    const issues = collectRefineIssues({
      signalType: "short",
      entryPrice: 100,
      stopLoss: 0,
      takeProfit1: null,
    });
    expect(issues).toEqual([]);
  });

  it("refine skips when entryPrice is a placeholder", () => {
    const issues = collectRefineIssues({
      signalType: "long",
      entryPrice: 0,
      stopLoss: 90,
      takeProfit1: 110,
    });
    expect(issues).toEqual([]);
  });

  it("refineSignalPriceLevels adds issues with expected messages", () => {
    const issues = collectRefineIssues({
      signalType: "short",
      entryPrice: 100,
      stopLoss: 90,
      takeProfit1: 110,
    });

    expect(issues.map((i) => i.message)).toEqual(
      expect.arrayContaining([
        "For Short signals, Stop Loss must be greater than the Entry Price.",
        "For Short signals, Target prices must be less than the Entry Price.",
      ]),
    );
  });

  it("refineSignalPriceLevels long messages match BUG-003–004", () => {
    const issues = collectRefineIssues({
      signalType: "long",
      entryPrice: 100,
      stopLoss: 110,
      takeProfit1: 90,
    });

    expect(issues.map((i) => i.message)).toEqual(
      expect.arrayContaining([
        "For Long signals, Stop Loss must be less than the Entry Price.",
        "For Long signals, Target prices must be greater than the Entry Price.",
      ]),
    );
  });
});

describe("signal outcome constants (BUG-005)", () => {
  it("defines pending / hit_target / stopped_out / cancelled", () => {
    expect(SIGNAL_OUTCOMES).toEqual([
      "pending",
      "hit_target",
      "stopped_out",
      "cancelled",
    ]);
  });
});
