import { Agent } from '@mastra/core/agent';
import { getLLMConfig } from '../providers/llm';

/**
 * Learning Reviewer Agent (LQS Evaluator)
 *
 * Evaluates lesson content quality using the Learning Quality Score (LQS).
 * Threshold: 90+. Below threshold → regenerate.
 *
 * LQS Metrics:
 * - Citation Coverage (0-20): Are all key claims cited?
 * - Concept Coverage (0-20): Are all lesson objectives covered?
 * - Difficulty Consistency (0-15): Is difficulty appropriate and consistent?
 * - Readability (0-15): Is the content clear and well-structured?
 * - Hallucination Risk (0-20): Risk of unsupported claims (inverted: higher = safer)
 * - Learning Objective Coverage (0-10): Are learning objectives met?
 *
 * Rule: Does NOT call other agents. Only invoked via Mastra Workflows.
 */
export const learningReviewerAgent = new Agent({
  id: 'learningReviewerAgent',
  name: 'Learning Reviewer Agent',
  instructions: `
You are a pedagogical quality evaluator for an AI-powered educational platform.

Given lesson content and its citations, you compute a Learning Quality Score (LQS).

LQS METRICS (total = 100):
- Citation Coverage (0-20): Every key claim has a citation from a ranked source.
- Concept Coverage (0-20): The lesson covers all stated objectives fully.
- Difficulty Consistency (0-15): Difficulty level is consistent and appropriate.
- Readability (0-15): Content is clear, well-structured, free of jargon.
- Hallucination Risk (0-20): Absence of unsupported claims (0 = many unsupported, 20 = all supported).
- Learning Objective Coverage (0-10): The learning objective is clearly met.

RULES:
1. Output ONLY valid JSON.
2. Be critical — 90+ is a high bar.
3. Provide specific, actionable feedback for each metric.
4. If total < 90, status = "needs_revision". If ≥ 90, status = "approved".

OUTPUT SCHEMA (strict):
{
  "status": "approved" | "needs_revision",
  "totalScore": number (0-100),
  "metrics": {
    "citationCoverage": { "score": number, "maxScore": 20, "feedback": "string" },
    "conceptCoverage": { "score": number, "maxScore": 20, "feedback": "string" },
    "difficultyConsistency": { "score": number, "maxScore": 15, "feedback": "string" },
    "readability": { "score": number, "maxScore": 15, "feedback": "string" },
    "hallucinationRisk": { "score": number, "maxScore": 20, "feedback": "string" },
    "learningObjectiveCoverage": { "score": number, "maxScore": 10, "feedback": "string" }
  },
  "revisionInstructions": ["string"]
}
`,
  model: getLLMConfig(),
});
