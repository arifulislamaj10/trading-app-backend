import {
  SIGNAL_OUTCOMES,
  updateSignalSchema,
} from "../app/modules/signal/signal.validation";
import {
  formatSignalOutcomeLabel,
  hitTargetMatch,
  resolveSignalOutcome,
  stoppedOutMatch,
} from "../app/modules/signal/signal.outcome";
import { logTradeSchema } from "../app/modules/copied_trade/copied_trade.validation";
import { TRAINING_LESSONS } from "../app/modules/training/training.constants";

describe("BUG-027 / BUG-034 signal outcome terminology", () => {
  it("exposes Hit Target and Stopped Out outcomes", () => {
    expect(SIGNAL_OUTCOMES).toEqual(
      expect.arrayContaining([
        "pending",
        "hit_target",
        "stopped_out",
        "cancelled",
      ]),
    );
  });

  it("accepts close payload with outcome and without resultPnl", async () => {
    await expect(
      updateSignalSchema.parseAsync({
        status: "completed",
        outcome: "hit_target",
      }),
    ).resolves.toMatchObject({
      status: "completed",
      outcome: "hit_target",
    });

    await expect(
      updateSignalSchema.parseAsync({
        status: "stopped_out",
      }),
    ).resolves.toMatchObject({
      status: "stopped_out",
    });
  });

  it("accepts legacy won/lost aliases for close", async () => {
    await expect(
      updateSignalSchema.parseAsync({ status: "won", resultPnl: 2 }),
    ).resolves.toMatchObject({ status: "won", resultPnl: 2 });

    await expect(
      updateSignalSchema.parseAsync({ status: "lost", resultPnl: -1 }),
    ).resolves.toMatchObject({ status: "lost", resultPnl: -1 });
  });
});

describe("BUG-027 resolveSignalOutcome (legacy pending on closed rows)", () => {
  it("keeps explicit terminal outcomes", () => {
    expect(
      resolveSignalOutcome({
        outcome: "hit_target",
        status: "completed",
        resultPnl: -5,
      }),
    ).toBe("hit_target");
    expect(
      resolveSignalOutcome({
        outcome: "stopped_out",
        status: "completed",
        resultPnl: 5,
      }),
    ).toBe("stopped_out");
    expect(
      resolveSignalOutcome({ outcome: "cancelled", status: "canceled" }),
    ).toBe("cancelled");
  });

  it("ignores stored pending when status is completed and uses PnL", () => {
    expect(
      resolveSignalOutcome({
        outcome: "pending",
        status: "completed",
        resultPnl: 2.5,
      }),
    ).toBe("hit_target");
    expect(
      resolveSignalOutcome({
        outcome: "pending",
        status: "completed",
        resultPnl: -1,
      }),
    ).toBe("stopped_out");
    expect(
      resolveSignalOutcome({
        outcome: "pending",
        status: "completed",
        resultPnl: null,
      }),
    ).toBe("hit_target");
  });

  it("maps legacy status won/lost/canceled", () => {
    expect(resolveSignalOutcome({ outcome: "pending", status: "won" })).toBe(
      "hit_target",
    );
    expect(resolveSignalOutcome({ outcome: "pending", status: "lost" })).toBe(
      "stopped_out",
    );
    expect(
      resolveSignalOutcome({ outcome: "pending", status: "canceled" }),
    ).toBe("cancelled");
  });

  it("keeps pending for active signals", () => {
    expect(resolveSignalOutcome({ outcome: "pending", status: "active" })).toBe(
      "pending",
    );
    expect(resolveSignalOutcome({ status: "active" })).toBe("pending");
  });

  it("formats user-facing labels", () => {
    expect(formatSignalOutcomeLabel("hit_target")).toBe("Hit Target");
    expect(formatSignalOutcomeLabel("stopped_out")).toBe("Stopped Out");
  });

  it("builds mutually exclusive reporting match fragments", () => {
    const hit = hitTargetMatch();
    const stop = stoppedOutMatch();
    expect(hit.status).toEqual({ $in: ["completed", "won", "lost"] });
    expect(stop.status).toEqual({ $in: ["completed", "won", "lost"] });
    expect(hit.$or).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ outcome: "hit_target" }),
      ]),
    );
    expect(stop.$or).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ outcome: "stopped_out" }),
      ]),
    );
  });
});

describe("BUG-034 trade outcome aliases", () => {
  it("accepts Hit Target / Stopped Out aliases for log trade", async () => {
    await expect(
      logTradeSchema.parseAsync({
        signalId: "64b2e1b9d1234f0012ab5678",
        entryPrice: 1.1,
        targetPrice: 1.15,
        outcome: "hit_target",
      }),
    ).resolves.toMatchObject({ outcome: "hit_target" });

    await expect(
      logTradeSchema.parseAsync({
        signalId: "64b2e1b9d1234f0012ab5678",
        entryPrice: 1.1,
        exitPrice: 1.05,
        outcome: "stopped_out",
      }),
    ).resolves.toMatchObject({ outcome: "stopped_out" });
  });

  it("still accepts legacy win/loss outcomes", async () => {
    await expect(
      logTradeSchema.parseAsync({
        signalId: "64b2e1b9d1234f0012ab5678",
        entryPrice: 1.1,
        targetPrice: 1.15,
        outcome: "win",
      }),
    ).resolves.toMatchObject({ outcome: "win" });
  });
});

describe("BUG-028 Target terminology in training content", () => {
  it("uses Target instead of take profit in reading_signals lesson", () => {
    const lesson = TRAINING_LESSONS.find(
      (l) => l.lessonId === "reading_signals",
    );
    expect(lesson?.description.toLowerCase()).toContain("target");
    expect(lesson?.description.toLowerCase()).not.toContain("take profit");
  });
});
