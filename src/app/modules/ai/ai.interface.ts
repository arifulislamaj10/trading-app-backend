export type AiValidationStatus = 'pass' | 'fail' | 'review';

export interface SignalValidationResult {
  status: AiValidationStatus;
  score: number;
  summary: string;
  risks: string[];
  suggestedEdits: string[];
  model: string;
  rawResponse?: string;
}

export interface MtAssistResult {
  summary: string;
  riskAnalysis: string;
  riskRewardNotes: string;
  suggestions: string[];
  model: string;
}

export interface SignalExtractionResult {
  signal: Record<string, unknown> | null;
  confidence: number;
  notes: string[];
  model: string;
}

export interface SignalValidationInput {
  title: string;
  description?: string;
  assetType: string;
  symbol: string;
  signalType: string;
  timeframe: string;
  entryPrice: number;
  stopLoss?: number | null;
  takeProfit1?: number | null;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  entryNotes?: string;
}
