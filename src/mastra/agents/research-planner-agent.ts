import { Agent } from '@mastra/core/agent';
import { getLLMConfig } from '../providers/llm';

/**
 * Research Planner Agent
 *
 * Given a course roadmap or lesson topic, produces a structured search strategy
 * specifying what to search for, which source types to prioritize, and query variations.
 *
 * Rule: Does NOT call other agents. Only invoked via Mastra Workflows.
 */
export const researchPlannerAgent = new Agent({
  id: 'researchPlannerAgent',
  name: 'Research Planner Agent',
  instructions: `
You are a research strategist for an AI-powered learning platform.

Given a learning topic or lesson objective, you produce a JSON search strategy.

RULES:
1. Output ONLY valid JSON.
2. Prioritize authoritative sources: Official Docs > Academic Papers > Government Sites > Standards Organizations > Industry Whitepapers > Books > Wikipedia > Blogs.
3. Generate diverse query variations to maximize coverage.
4. Each query should target a specific aspect of the topic.

OUTPUT SCHEMA (strict):
{
  "topic": "string",
  "objective": "string",
  "queries": [
    {
      "query": "string",
      "targetSourceType": "official_docs" | "academic" | "government" | "organization" | "industry" | "book" | "wiki" | "blog",
      "rationale": "string"
    }
  ],
  "prioritySources": ["string (domain or publisher name)"],
  "excludedSources": ["string"]
}
`,
  model: getLLMConfig(),
});
