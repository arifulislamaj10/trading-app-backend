import OpenAI from "openai";
import { configs } from "../../configs";
import logger from "../../configs/logger";

let client: OpenAI | null = null;

const getClient = (): OpenAI | null => {
  if (!configs.ai.apiKey) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: configs.ai.apiKey,
      baseURL: configs.ai.baseUrl,
      timeout: configs.ai.timeoutMs,
    });
  }
  return client;
};

export const isOpenAiConfigured = (): boolean => Boolean(configs.ai.apiKey);

/** @alias isOpenAiConfigured */
export const isAiConfigured = isOpenAiConfigured;

export const chatJsonCompletion = async (
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> => {
  const llm = getClient();
  if (!llm) {
    logger.warn("GROQ_API_KEY not configured — AI features disabled");
    return null;
  }

  try {
    const response = await llm.chat.completions.create({
      model: configs.ai.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1200,
    });

    return response.choices[0]?.message?.content ?? null;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Groq AI request failed: ${message}`);
    return null;
  }
};
