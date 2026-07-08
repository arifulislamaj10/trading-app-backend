import { configs } from '../../configs';
import {
  MtAssistResult,
  SignalExtractionResult,
  SignalValidationInput,
  SignalValidationResult,
} from './ai.interface';
import {
  buildAssistUserPrompt,
  buildExtractionUserPrompt,
  buildValidationUserPrompt,
  MT_ASSIST_SYSTEM_PROMPT,
  SIGNAL_EXTRACTION_SYSTEM_PROMPT,
  SIGNAL_VALIDATION_SYSTEM_PROMPT,
} from './ai.prompts';
import { chatJsonCompletion, isOpenAiConfigured } from './openai.client';

const parseJson = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const fallbackValidation = (): SignalValidationResult => ({
  status: 'review',
  score: 50,
  summary: 'AI validation unavailable. Master Trader manual review required.',
  risks: ['Automated validation could not be completed'],
  suggestedEdits: [],
  model: 'fallback',
});

const validate_signal = async (
  input: SignalValidationInput
): Promise<SignalValidationResult> => {
  if (!isOpenAiConfigured()) {
    return fallbackValidation();
  }

  const raw = await chatJsonCompletion(
    SIGNAL_VALIDATION_SYSTEM_PROMPT,
    buildValidationUserPrompt(input as unknown as Record<string, unknown>)
  );

  if (!raw) return fallbackValidation();

  const parsed = parseJson<{
    status?: string;
    score?: number;
    summary?: string;
    risks?: string[];
    suggestedEdits?: string[];
  }>(raw);

  if (!parsed) return { ...fallbackValidation(), rawResponse: raw };

  const status =
    parsed.status === 'pass' || parsed.status === 'fail' || parsed.status === 'review'
      ? parsed.status
      : 'review';

  return {
    status,
    score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
    summary: parsed.summary || 'No summary provided',
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    suggestedEdits: Array.isArray(parsed.suggestedEdits) ? parsed.suggestedEdits : [],
    model: configs.ai.model,
    rawResponse: raw,
  };
};

const assist_master_signal = async (
  input: SignalValidationInput
): Promise<MtAssistResult> => {
  const fallback: MtAssistResult = {
    summary: 'AI assistant unavailable.',
    riskAnalysis: 'Please review risk manually.',
    riskRewardNotes: '',
    suggestions: ['Verify stop loss and take profit levels before publishing.'],
    model: 'fallback',
  };

  if (!isOpenAiConfigured()) return fallback;

  const raw = await chatJsonCompletion(
    MT_ASSIST_SYSTEM_PROMPT,
    buildAssistUserPrompt(input as unknown as Record<string, unknown>)
  );

  if (!raw) return fallback;

  const parsed = parseJson<{
    summary?: string;
    riskAnalysis?: string;
    riskRewardNotes?: string;
    suggestions?: string[];
  }>(raw);

  if (!parsed) return fallback;

  return {
    summary: parsed.summary || fallback.summary,
    riskAnalysis: parsed.riskAnalysis || fallback.riskAnalysis,
    riskRewardNotes: parsed.riskRewardNotes || '',
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : fallback.suggestions,
    model: configs.ai.model,
  };
};

/**
 * Extract structured signal fields from loosely-formatted JSON (or JSON-like text).
 * Returns null when the AI provider is not configured or the request fails.
 */
const extract_signal_from_json = async (
  rawContent: string
): Promise<SignalExtractionResult | null> => {
  if (!isOpenAiConfigured()) return null;

  const raw = await chatJsonCompletion(
    SIGNAL_EXTRACTION_SYSTEM_PROMPT,
    buildExtractionUserPrompt(rawContent)
  );

  if (!raw) return null;

  const parsed = parseJson<{
    signal?: Record<string, unknown> | null;
    confidence?: number;
    notes?: string[];
  }>(raw);

  if (!parsed) return null;

  return {
    signal:
      parsed.signal && typeof parsed.signal === 'object' ? parsed.signal : null,
    confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
    notes: Array.isArray(parsed.notes) ? parsed.notes.map(String) : [],
    model: configs.ai.model,
  };
};

export const ai_services = {
  validate_signal,
  assist_master_signal,
  extract_signal_from_json,
  isOpenAiConfigured,
};
