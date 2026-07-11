import { z } from "zod";

// Base schema without publish validation (for updates)
export const signalBaseFields = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(5000).optional(),
  assetType: z.enum([
    "forex",
    "crypto",
    "stocks",
    "indices",
    "commodities",
    "futures",
    "options",
    "etfs",
  ]),
  symbol: z
    .string()
    .min(1)
    .max(20)
    .transform((val) => val.toUpperCase()),
  signalType: z.enum(["long", "short"]),
  timeframe: z.enum(["m1", "m5", "m15", "m30", "h1", "h4", "d1", "w1", "mn1"]),
  entryPrice: z.coerce.number().positive(),
  entryNotes: z.string().max(1000).optional(),
  stopLoss: z.coerce.number().positive().nullable().optional(),
  takeProfit1: z.coerce.number().positive().nullable().optional(),
  takeProfit2: z.coerce.number().positive().nullable().optional(),
  takeProfit3: z.coerce.number().positive().nullable().optional(),
  tags: z.array(z.string()).max(10).optional(),
  externalChartUrl: z.string().url().nullable().optional().or(z.literal("")),
  videoUrl: z.string().url().nullable().optional().or(z.literal("")),
  publishType: z.enum(["instant", "scheduled"]).default("instant"),
  // scheduledAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  closedAt: z.string().datetime().nullable().optional(),
  resultPnl: z.coerce.number().nullable().optional(),
  pnlUnit: z.enum(["usd", "percent"]).default("usd").optional(),
  closeNotes: z.string().max(1000).optional(),
  status: z
    .enum([
      "draft",
      "scheduled",
      "active",
      "closed",
      "expired",
      "canceled",
      "published",
      "completed",
      "cancelled",
      "won",
      "lost",
    ])
    .optional(),
});

// Create schema with validation for scheduled publish
export const createSignalSchema = signalBaseFields.superRefine((data, ctx) => {
  // If publishType is 'scheduled', scheduledAt is required and must be in the future
  if (data.publishType === "scheduled") {
    if (!data.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "scheduledAt is required when publishType is scheduled",
        path: ["scheduledAt"],
      });
    } else {
      const scheduledDate = new Date(data.scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduledAt must be a valid ISO 8601 datetime",
          path: ["scheduledAt"],
        });
      } else if (scheduledDate <= new Date()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduledAt must be in the future",
          path: ["scheduledAt"],
        });
      }
    }
  }
});

// Update schema (partial - all fields optional)
export const updateSignalSchema = signalBaseFields
  .partial()
  .superRefine((data, ctx) => {
    // If updating to scheduled publish, validate scheduledAt
    if (data.publishType === "scheduled" && data.scheduledAt) {
      const scheduledDate = new Date(data.scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduledAt must be a valid ISO 8601 datetime",
          path: ["scheduledAt"],
        });
      } else if (scheduledDate <= new Date()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scheduledAt must be in the future",
          path: ["scheduledAt"],
        });
      }
    }
  });

export const closeSignalSchema = z.object({
  resultPnl: z.coerce.number().nullable().optional(),
  closeNotes: z.string().max(1000).optional(),
});

export const signalQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  symbol: z.string().optional(),
  sortBy: z.string().optional(),
  assetType: z
    .enum([
      "forex",
      "crypto",
      "stocks",
      "indices",
      "commodities",
      "futures",
      "options",
      "etfs",
    ])
    .optional(),
  signalType: z.enum(["long", "short"]).optional(),
  status: z
    .enum([
      "all",
      "draft",
      "scheduled",
      "active",
      "published",
      "completed",
      "closed",
      "expired",
      "canceled",
      "cancelled",
      "won",
      "lost",
    ])
    .optional(),
  isPremium: z.coerce.boolean().optional(),
  authorId: z.string().optional(),
  publishType: z.enum(["instant", "scheduled"]).optional(),
});

export const rejectSignalSchema = z.object({
  rejectionReason: z.string().max(500).optional(),
});

export const createSignalFromJsonSchema = z.object({
  signal: createSignalSchema,
  skipAiWorkflow: z.boolean().optional(),
});

// Loose JSON import: content is arbitrary user-provided JSON (object or raw string)
// that AI maps to the signal schema before validation.
export const extractSignalFromJsonSchema = z.object({
  content: z
    .unknown()
    .refine((val) => val !== undefined && val !== null, {
      message: "content is required",
    }),
  skipAiWorkflow: z.boolean().optional(),
});

export const signal_validations = {
  createSignalSchema,
  updateSignalSchema,
  closeSignalSchema,
  signalQuerySchema,
  rejectSignalSchema,
  createSignalFromJsonSchema,
  extractSignalFromJsonSchema,
};
