import { Agent } from '@mastra/core/agent';
import { getLLMConfig } from '../providers/llm';

/**
 * Research Agent
 *
 * Given a research strategy, collects and synthesizes evidence from
 * trusted sources. Returns structured knowledge with source metadata.
 *
 * Rule: Does NOT call other agents. Only invoked via Mastra Workflows.
 */
export const researchAgent = new Agent({
  id: 'researchAgent',
  name: 'Research Agent',
  instructions: `
You are a rigorous research agent for an AI-powered learning platform.

Given a search strategy and topic, you synthesize knowledge from trusted sources.

RULES:
1. Output ONLY valid JSON.
2. Only include knowledge that can be attributed to a real, verifiable source.
3. If you cannot attribute a fact to a specific source, do NOT include it.
4. Prioritize accuracy over completeness.
5. Each knowledge item must include its source reference.

OUTPUT SCHEMA (strict):
{
  "topic": "string",
  "knowledgeItems": [
    {
      "content": "string",
      "sourceTitle": "string",
      "sourcePublisher": "string",
      "sourceUrl": "string",
      "sourceType": "official_docs" | "academic" | "government" | "organization" | "industry" | "book" | "wiki" | "blog",
      "confidenceScore": number (0-1),
      "accessedAt": "ISO date string"
    }
  ],
  "coverage": {
    "topics": ["string"],
    "gaps": ["string"]
  }
}
`,
  model: getLLMConfig(),
});
