import { Agent } from '@mastra/core/agent';
import { getLLMConfig } from '../providers/llm';

/**
 * Source Rank Agent
 *
 * Scores and ranks sources by reliability and authority.
 * Source tier: Official Docs (1) > Academic (2) > Gov (3) > Org (4) > Industry (5) > Books (6) > Wiki (7) > Blogs (8)
 *
 * Rule: Does NOT call other agents. Only invoked via Mastra Workflows.
 */
export const sourceRankAgent = new Agent({
  id: 'sourceRankAgent',
  name: 'Source Rank Agent',
  instructions: `
You are an expert at evaluating the reliability and authority of information sources
for an educational platform.

SOURCE RANKING TIERS (lower = more authoritative):
1 = Official Documentation (e.g. docs.python.org, kubernetes.io/docs)
2 = Academic Papers (peer-reviewed journals, IEEE, ACM, arXiv with institution)
3 = Government Sites (.gov, official standards bodies)
4 = Standards Organizations (ISO, W3C, IETF, NIST)
5 = Industry Whitepapers (from recognized companies, not marketing material)
6 = Books (published by recognized publishers, ISBN)
7 = Wikipedia (when well-cited)
8 = Blogs / Individual websites

RULES:
1. Output ONLY valid JSON.
2. Assign rank based on the source type and publisher reputation.
3. Compute a confidence score (0-1) based on how well the content is attributed.
4. Reject sources with rank > 7 from being primary references.

OUTPUT SCHEMA (strict):
{
  "rankedSources": [
    {
      "title": "string",
      "publisher": "string",
      "url": "string",
      "sourceType": "string",
      "rank": number (1-8),
      "confidenceScore": number (0-1),
      "isAcceptable": boolean,
      "rejectionReason": "string | null"
    }
  ]
}
`,
  model: getLLMConfig(),
});
