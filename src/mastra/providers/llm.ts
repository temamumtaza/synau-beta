/**
 * LLM Provider abstraction for Synau.
 *
 * Uses a custom OpenAI-compatible endpoint (https://ai.sumopod.com/v1).
 * Never hardcode keys — always read from environment.
 *
 * Mastra natively supports OpenAICompatibleConfig via:
 *   { id: "provider/model", url, apiKey, headers? }
 */

export const LLM_BASE_URL =
  process.env.LLM_BASE_URL ?? 'https://ai.sumopod.com/v1';

export const LLM_MODEL_ID = process.env.LLM_MODEL_ID ?? 'gpt-5-nano';

export const LLM_PROVIDER_ID = process.env.LLM_PROVIDER_ID ?? 'sumopod';

/**
 * Returns a Mastra OpenAICompatibleConfig object.
 * Pass this as the `model` field of any Agent.
 */
export function getLLMConfig() {
  const apiKey = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'LLM_API_KEY or OPENAI_API_KEY environment variable is required'
    );
  }

  return {
    providerId: LLM_PROVIDER_ID,
    modelId: LLM_MODEL_ID,
    url: LLM_BASE_URL,
    apiKey,
  } as const;
}
