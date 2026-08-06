import { SignalOutcome } from "./signal.schema";

export type SignalOutcomeSource = {
  outcome?: string | null;
  status?: string | null;
  resultPnl?: number | null;
};

const CLOSED_STATUSES = new Set([
  "completed",
  "closed",
  "won",
  "lost",
  "hit_target",
  "stopped_out",
  "canceled",
  "cancelled",
]);

const TERMINAL_OUTCOMES = new Set(["hit_target", "stopped_out", "cancelled"]);

/**
 * Resolve display/reporting outcome from stored fields.
 * BUG-027: stored `outcome: pending` is NOT authoritative when status is already closed —
 * fall back to status aliases / resultPnl so legacy completed rows report correctly.
 */
export const resolveSignalOutcome = (
  source: SignalOutcomeSource,
): SignalOutcome => {
  const stored = String(source.outcome || "").toLowerCase();
  if (TERMINAL_OUTCOMES.has(stored)) {
    return stored as SignalOutcome;
  }

  const status = String(source.status || "").toLowerCase();

  if (status === "canceled" || status === "cancelled") {
    return "cancelled";
  }
  if (status === "won" || status === "hit_target") {
    return "hit_target";
  }
  if (status === "lost" || status === "stopped_out") {
    return "stopped_out";
  }
  if (status === "completed" || status === "closed") {
    if (source.resultPnl != null && source.resultPnl < 0) {
      return "stopped_out";
    }
    return "hit_target";
  }

  return "pending";
};

/** True when the signal is finished (closed or cancelled), regardless of legacy pending outcome. */
export const isSignalClosed = (source: SignalOutcomeSource): boolean => {
  const status = String(source.status || "").toLowerCase();
  if (CLOSED_STATUSES.has(status)) return true;
  return TERMINAL_OUTCOMES.has(String(source.outcome || "").toLowerCase());
};

/** Non-terminal / missing outcome (legacy rows often keep outcome: pending). */
const legacyOutcomeClause = {
  outcome: { $nin: ["hit_target", "stopped_out", "cancelled"] },
};

/**
 * Mongo match fragment: closed signals that count as Hit Target for reporting.
 * Prefers explicit outcome; then status won; then completed + PnL (>=0 / null).
 * Does not use PnL alone when status is lost (avoids double-count).
 */
export const hitTargetMatch = () => ({
  status: { $in: ["completed", "won", "lost"] },
  $or: [
    { outcome: "hit_target" },
    { ...legacyOutcomeClause, status: "won" },
    {
      ...legacyOutcomeClause,
      status: "completed",
      $or: [
        { resultPnl: { $gte: 0 } },
        { resultPnl: null },
        { resultPnl: { $exists: false } },
      ],
    },
  ],
});

/**
 * Mongo match fragment: closed signals that count as Stopped Out for reporting.
 */
export const stoppedOutMatch = () => ({
  status: { $in: ["completed", "won", "lost"] },
  $or: [
    { outcome: "stopped_out" },
    { ...legacyOutcomeClause, status: "lost" },
    { ...legacyOutcomeClause, status: "completed", resultPnl: { $lt: 0 } },
  ],
});

/**
 * Aggregation $cond expression: 1 if document is a Hit Target win, else 0.
 * Mirrors hitTargetMatch for pipeline use.
 */
export const hitTargetAggCond = () => ({
  $cond: [
    {
      $or: [
        { $eq: ["$outcome", "hit_target"] },
        {
          $and: [
            {
              $not: [
                {
                  $in: ["$outcome", ["hit_target", "stopped_out", "cancelled"]],
                },
              ],
            },
            { $eq: ["$status", "won"] },
          ],
        },
        {
          $and: [
            {
              $not: [
                {
                  $in: ["$outcome", ["hit_target", "stopped_out", "cancelled"]],
                },
              ],
            },
            { $eq: ["$status", "completed"] },
            {
              $or: [
                { $gte: ["$resultPnl", 0] },
                { $eq: ["$resultPnl", null] },
                { $eq: [{ $type: "$resultPnl" }, "missing"] },
              ],
            },
          ],
        },
      ],
    },
    1,
    0,
  ],
});

export const formatSignalOutcomeLabel = (
  outcome: SignalOutcome | string,
): string => {
  switch (String(outcome)) {
    case "hit_target":
      return "Hit Target";
    case "stopped_out":
      return "Stopped Out";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    case "pending":
    default:
      return "Pending";
  }
};
