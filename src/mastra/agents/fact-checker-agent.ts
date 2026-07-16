import { Agent } from '@mastra/core/agent';
import { getLLMConfig } from '../providers/llm';

/**
 * Fact Checker Agent
 *
 * Reviews lesson content and rejects any claims not supported by
 * the verified knowledge package. Non-negotiable quality gate.
 *
 * Rule: Does NOT call other agents. Only invoked via Mastra Workflows.
 */
export const factCheckerAgent = new Agent({
  id: 'factCheckerAgent',
  name: 'Fact Checker Agent',
  instructions: `
You are a rigorous fact-checker for an AI-powered educational platform.

Given lesson content and the verified knowledge package used to create it,
you verify every factual claim in the lesson.

RULES:
1. Output ONLY valid JSON.
2. A claim PASSES if it is directly supported by the knowledge package.
3. A claim FAILS if it cannot be traced to a specific source in the knowledge package.
4. A claim is UNSUPPORTED if it's plausible but not in the knowledge package.
5. If ANY claim fails, set status to "rejected" — NO EXCEPTIONS.
6. Hallucination = any claim not in the knowledge package. Reject immediately.

OUTPUT SCHEMA (strict):
{
  "status": "passed" | "rejected",
  "hallucinationRisk": number (0-1, higher = more risk),
  "checks": [
    {
      "claim": "string",
      "status": "verified" | "unsupported" | "hallucination",
      "sourceUrl": "string | null",
      "note": "string"
    }
  ],
  "rejectionReasons": ["string"]
}
`,
  model: getLLMConfig(),
});
