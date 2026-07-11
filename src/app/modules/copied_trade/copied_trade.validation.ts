import { z } from 'zod';

export const logTradeSchema = z.object({
  signalId: z.string().min(1, 'Signal ID is required'),
  entryPrice: z.coerce.number().positive('Entry price must be positive'),
  exitPrice: z.coerce.number().positive('Exit price must be positive'),
  lotSize: z.coerce.number().positive('Lot size must be positive').optional(),
  resultPnl: z.coerce.number().optional(),
  outcome: z.enum(['win', 'loss', 'breakeven']),
  notes: z.string().max(2000).optional().or(z.literal('')),
  screenshotUrl: z.string().url().optional().or(z.literal('')),
  externalPlatform: z.string().max(50).optional().or(z.literal('')),
  pnlUnit: z.enum(['usd', 'percent']).default('usd').optional(),
});

export const tradeHistoryQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  status: z.enum(['pending', 'completed', 'failed']).optional(),
  sortBy: z.string().optional(),
  outcome: z.enum(['win', 'loss', 'breakeven']).optional(),
  masterId: z.string().optional(),
  assetType: z.enum(['forex', 'crypto', 'stocks', 'indices', 'commodities']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const copierStatsQuerySchema = z.object({
  timeframe: z.enum(['week', 'month', 'all']).optional(),
});

export const copied_trade_validations = {
  logTradeSchema,
  tradeHistoryQuerySchema,
  copierStatsQuerySchema,
};
