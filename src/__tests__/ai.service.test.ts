import { ai_services } from '../app/modules/ai/ai.service';
import * as openaiClient from '../app/modules/ai/openai.client';

jest.mock('../app/modules/ai/openai.client');

const mockChat = openaiClient.chatJsonCompletion as jest.MockedFunction<
  typeof openaiClient.chatJsonCompletion
>;

const baseInput = {
  title: 'EURUSD Long',
  assetType: 'forex',
  symbol: 'EURUSD',
  signalType: 'long',
  timeframe: 'h1',
  entryPrice: 1.085,
  stopLoss: 1.082,
  takeProfit1: 1.091,
};

describe('ai_services.validate_signal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (openaiClient.isOpenAiConfigured as jest.Mock).mockReturnValue(true);
  });

  it('returns fallback when Groq is not configured', async () => {
    (openaiClient.isOpenAiConfigured as jest.Mock).mockReturnValue(false);
    const result = await ai_services.validate_signal(baseInput);
    expect(result.status).toBe('review');
    expect(result.model).toBe('fallback');
    expect(mockChat).not.toHaveBeenCalled();
  });

  it('parses valid Groq JSON response', async () => {
    mockChat.mockResolvedValue(
      JSON.stringify({
        status: 'pass',
        score: 82,
        summary: 'Solid setup',
        risks: ['News risk'],
        suggestedEdits: [],
      })
    );
    const result = await ai_services.validate_signal(baseInput);
    expect(result.status).toBe('pass');
    expect(result.score).toBe(82);
    expect(result.summary).toBe('Solid setup');
    expect(result.risks).toEqual(['News risk']);
  });

  it('maps invalid status to review', async () => {
    mockChat.mockResolvedValue(
      JSON.stringify({ status: 'unknown', score: 10, summary: 'x', risks: [] })
    );
    const result = await ai_services.validate_signal(baseInput);
    expect(result.status).toBe('review');
  });

  it('returns fallback when Groq returns null', async () => {
    mockChat.mockResolvedValue(null);
    const result = await ai_services.validate_signal(baseInput);
    expect(result.model).toBe('fallback');
    expect(result.status).toBe('review');
  });
});

describe('ai_services.assist_master_signal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (openaiClient.isOpenAiConfigured as jest.Mock).mockReturnValue(true);
  });

  it('returns structured assist from Groq', async () => {
    mockChat.mockResolvedValue(
      JSON.stringify({
        summary: 'Overview',
        riskAnalysis: 'SL is tight',
        riskRewardNotes: '1:2 R:R',
        suggestions: ['Widen stop'],
      })
    );
    const result = await ai_services.assist_master_signal(baseInput);
    expect(result.summary).toBe('Overview');
    expect(result.suggestions).toContain('Widen stop');
  });

  it('returns fallback when Groq fails', async () => {
    mockChat.mockResolvedValue(null);
    const result = await ai_services.assist_master_signal(baseInput);
    expect(result.model).toBe('fallback');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

describe('ai_services.extract_signal_from_json', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (openaiClient.isOpenAiConfigured as jest.Mock).mockReturnValue(true);
  });

  it('returns null when Groq is not configured', async () => {
    (openaiClient.isOpenAiConfigured as jest.Mock).mockReturnValue(false);
    const result = await ai_services.extract_signal_from_json('{"pair":"BTCUSDT"}');
    expect(result).toBeNull();
    expect(mockChat).not.toHaveBeenCalled();
  });

  it('parses extracted signal from Groq response', async () => {
    mockChat.mockResolvedValue(
      JSON.stringify({
        signal: {
          title: 'BTCUSDT Long H1',
          assetType: 'crypto',
          symbol: 'BTCUSDT',
          signalType: 'long',
          timeframe: 'h1',
          entryPrice: 50000,
          stopLoss: 49000,
          takeProfit1: 52000,
        },
        confidence: 90,
        notes: ['Mapped "pair" to symbol'],
      })
    );
    const result = await ai_services.extract_signal_from_json(
      '{"pair":"BTCUSDT","side":"buy","entry":50000,"sl":49000,"tp":52000,"tf":"1h"}'
    );
    expect(result).not.toBeNull();
    expect(result!.signal).toMatchObject({ symbol: 'BTCUSDT', signalType: 'long' });
    expect(result!.confidence).toBe(90);
    expect(result!.notes).toContain('Mapped "pair" to symbol');
  });

  it('returns null signal when extraction is impossible', async () => {
    mockChat.mockResolvedValue(
      JSON.stringify({ signal: null, confidence: 0, notes: ['No entry price found'] })
    );
    const result = await ai_services.extract_signal_from_json('{"foo":"bar"}');
    expect(result).not.toBeNull();
    expect(result!.signal).toBeNull();
    expect(result!.notes).toContain('No entry price found');
  });

  it('returns null when Groq returns unparseable output', async () => {
    mockChat.mockResolvedValue('not json');
    const result = await ai_services.extract_signal_from_json('{"foo":"bar"}');
    expect(result).toBeNull();
  });
});
