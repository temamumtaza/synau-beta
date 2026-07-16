/* eslint-disable @typescript-eslint/no-explicit-any */
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

// ─── Lesson Workflow ───────────────────────────────────────────────────────
// Flow: Open Lesson → Generate → Citation → Review → Ready
// Called when a user opens an ungenerated lesson (lazy generation).

const generateLessonContentStep = createStep({
  id: 'generateLessonContent',
  description: 'Generate lesson content using research → teacher pipeline',
  inputSchema: z.object({
    lessonId: z.string(),
    lessonTitle: z.string(),
    lessonObjective: z.string(),
    courseTitle: z.string(),
    courseDifficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    chapterTitle: z.string(),
  }),
  outputSchema: z.object({
    lessonId: z.string(),
    lessonTitle: z.string(),
    lessonObjective: z.string(),
    researchStrategy: z.any(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('researchPlannerAgent');
    if (!agent) throw new Error('researchPlannerAgent not found');

    const strategySchema = z.object({
      topic: z.string(),
      objective: z.string(),
      queries: z.array(z.any()),
      prioritySources: z.array(z.string()),
      excludedSources: z.array(z.string()),
    });

    const result = await agent.generate(
      `Create a research strategy for lesson: "${inputData.lessonTitle}"\nObjective: "${inputData.lessonObjective}"\nReturn ONLY valid JSON.`,
      { structuredOutput: { schema: strategySchema } }
    );

    return {
      lessonId: inputData.lessonId,
      lessonTitle: inputData.lessonTitle,
      lessonObjective: inputData.lessonObjective,
      researchStrategy: result.object,
    };
  },
});

const researchLessonStep = createStep({
  id: 'researchLesson',
  description: 'Collect and rank research for the lesson',
  inputSchema: z.object({
    lessonId: z.string(),
    lessonTitle: z.string(),
    lessonObjective: z.string(),
    researchStrategy: z.any(),
  }),
  outputSchema: z.object({
    lessonId: z.string(),
    lessonTitle: z.string(),
    lessonObjective: z.string(),
    knowledgePackage: z.any(),
  }),
  execute: async ({ inputData, mastra }) => {
    const researchAgentInstance = mastra?.getAgent('researchAgent');
    const sourceRankAgentInstance = mastra?.getAgent('sourceRankAgent');
    const groundingAgentInstance = mastra?.getAgent('groundingAgent');

    if (!researchAgentInstance) throw new Error('researchAgent not found');
    if (!sourceRankAgentInstance) throw new Error('sourceRankAgent not found');
    if (!groundingAgentInstance) throw new Error('groundingAgent not found');

    const researchSchema = z.object({
      topic: z.string(),
      knowledgeItems: z.array(z.any()),
      coverage: z.object({ topics: z.array(z.string()), gaps: z.array(z.string()) }),
    });

    const research = await researchAgentInstance.generate(
      `Research: "${inputData.lessonTitle}"\nObjective: "${inputData.lessonObjective}"\nStrategy: ${JSON.stringify(inputData.researchStrategy)}\nReturn ONLY valid JSON.`,
      { structuredOutput: { schema: researchSchema } }
    );

    const rankSchema = z.object({ rankedSources: z.array(z.any()) });
    const sources = (research.object as any).knowledgeItems?.map((i: any) => ({
      title: i.sourceTitle,
      publisher: i.sourcePublisher,
      url: i.sourceUrl,
      sourceType: i.sourceType,
    })) ?? [];

    const ranked = await sourceRankAgentInstance.generate(
      `Rank these sources:\n${JSON.stringify(sources)}\nReturn ONLY valid JSON.`,
      { structuredOutput: { schema: rankSchema } }
    );

    const groundingSchema = z.object({
      status: z.enum(['sufficient', 'insufficient']),
      insufficiencyReason: z.string().nullable(),
      verifiedFacts: z.array(z.any()),
      sources: z.array(z.any()),
      topicCoverage: z.array(z.string()),
      unverifiedClaims: z.array(z.string()),
    });

    const grounded = await groundingAgentInstance.generate(
      `Ground knowledge for: "${inputData.lessonTitle}"\nResearch: ${JSON.stringify(research.object)}\nRanked Sources: ${JSON.stringify((ranked.object as any).rankedSources)}\nReturn ONLY valid JSON.`,
      { structuredOutput: { schema: groundingSchema } }
    );

    const pkg = grounded.object as z.infer<typeof groundingSchema>;
    if (pkg.status === 'insufficient') {
      throw new Error(`Insufficient research: ${pkg.insufficiencyReason}`);
    }

    return {
      lessonId: inputData.lessonId,
      lessonTitle: inputData.lessonTitle,
      lessonObjective: inputData.lessonObjective,
      knowledgePackage: pkg,
    };
  },
});

const teachLessonStep = createStep({
  id: 'teachLesson',
  description: 'Teacher Agent generates lesson content',
  inputSchema: z.object({
    lessonId: z.string(),
    lessonTitle: z.string(),
    lessonObjective: z.string(),
    knowledgePackage: z.any(),
  }),
  outputSchema: z.object({
    lessonId: z.string(),
    lessonContent: z.any(),
    knowledgePackage: z.any(),
  }),
  execute: async ({ inputData, mastra }) => {
    const teacherAgentInstance = mastra?.getAgent('teacherAgent');
    const factCheckerAgentInstance = mastra?.getAgent('factCheckerAgent');
    if (!teacherAgentInstance) throw new Error('teacherAgent not found');
    if (!factCheckerAgentInstance) throw new Error('factCheckerAgent not found');

    const lessonSchema = z.object({
      status: z.enum(['ready', 'rejected']),
      rejectionReason: z.string().nullable(),
      lesson: z.object({
        title: z.string(),
        objective: z.string(),
        explanation: z.string(),
        examples: z.array(z.object({ title: z.string(), content: z.string() })),
        summary: z.string(),
        keyPoints: z.array(z.string()),
        citedSourceUrls: z.array(z.string()),
      }).nullable(),
    });

    const lessonResult = await teacherAgentInstance.generate(
      `Create lesson: "${inputData.lessonTitle}"\nObjective: "${inputData.lessonObjective}"\nKnowledge Package: ${JSON.stringify(inputData.knowledgePackage)}\nReturn ONLY valid JSON.`,
      { structuredOutput: { schema: lessonSchema } }
    );

    const lesson = lessonResult.object as z.infer<typeof lessonSchema>;
    if (lesson.status === 'rejected') {
      throw new Error(`Lesson rejected: ${lesson.rejectionReason}`);
    }

    // Fact check
    const factCheckSchema = z.object({
      status: z.enum(['passed', 'rejected']),
      hallucinationRisk: z.number(),
      checks: z.array(z.any()),
      rejectionReasons: z.array(z.string()),
    });

    const factCheck = await factCheckerAgentInstance.generate(
      `Fact check this lesson:\n${JSON.stringify(lesson.lesson)}\nAgainst knowledge package:\n${JSON.stringify(inputData.knowledgePackage)}\nReturn ONLY valid JSON.`,
      { structuredOutput: { schema: factCheckSchema } }
    );

    const check = factCheck.object as z.infer<typeof factCheckSchema>;
    if (check.status === 'rejected') {
      throw new Error(`Fact check failed: ${check.rejectionReasons.join(', ')}`);
    }

    return {
      lessonId: inputData.lessonId,
      lessonContent: lesson.lesson,
      knowledgePackage: inputData.knowledgePackage,
    };
  },
});

const citeLessonStep = createStep({
  id: 'citeLesson',
  description: 'Build citations and run LQS evaluation',
  inputSchema: z.object({
    lessonId: z.string(),
    lessonContent: z.any(),
    knowledgePackage: z.any(),
  }),
  outputSchema: z.object({
    lessonId: z.string(),
    lessonContent: z.any(),
    citations: z.array(z.any()),
    lqsScore: z.number(),
    status: z.literal('ready'),
  }),
  execute: async ({ inputData, mastra }) => {
    const citationAgentInstance = mastra?.getAgent('citationBuilderAgent');
    const reviewAgentInstance = mastra?.getAgent('learningReviewerAgent');
    if (!citationAgentInstance) throw new Error('citationBuilderAgent not found');
    if (!reviewAgentInstance) throw new Error('learningReviewerAgent not found');

    const citationSchema = z.object({
      citations: z.array(z.object({
        title: z.string(),
        publisher: z.string(),
        url: z.string(),
        accessedAt: z.string().nullable().optional(),
        confidenceScore: z.number(),
        sourceRank: z.number(),
        citation: z.string(),
      })),
    });

    const citeResult = await citationAgentInstance.generate(
      `Build citations for sources:\n${JSON.stringify((inputData.knowledgePackage as any).sources ?? [])}\nReturn ONLY valid JSON.`,
      { structuredOutput: { schema: citationSchema } }
    );

    const citations = (citeResult.object as z.infer<typeof citationSchema>).citations;

    const lqsSchema = z.object({
      status: z.enum(['approved', 'needs_revision']),
      totalScore: z.number(),
      metrics: z.record(z.any()),
      revisionInstructions: z.array(z.string()),
    });

    const lqsResult = await reviewAgentInstance.generate(
      `Evaluate LQS for:\n${JSON.stringify(inputData.lessonContent)}\nCitations:\n${JSON.stringify(citations)}\nReturn ONLY valid JSON.`,
      { structuredOutput: { schema: lqsSchema } }
    );

    const lqs = lqsResult.object as z.infer<typeof lqsSchema>;

    if (lqs.status === 'needs_revision') {
      throw new Error(`LQS too low (${lqs.totalScore}/100). ${lqs.revisionInstructions.join('; ')}`);
    }

    return {
      lessonId: inputData.lessonId,
      lessonContent: inputData.lessonContent,
      citations,
      lqsScore: lqs.totalScore,
      status: 'ready' as const,
    };
  },
});

export const lessonWorkflow = createWorkflow({
  id: 'lessonWorkflow',
  inputSchema: z.object({
    lessonId: z.string(),
    lessonTitle: z.string(),
    lessonObjective: z.string(),
    courseTitle: z.string(),
    courseDifficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    chapterTitle: z.string(),
  }),
  outputSchema: z.object({
    lessonId: z.string(),
    lessonContent: z.any(),
    citations: z.array(z.any()),
    lqsScore: z.number(),
    status: z.literal('ready'),
  }),
})
  .then(generateLessonContentStep)
  .then(researchLessonStep)
  .then(teachLessonStep)
  .then(citeLessonStep)
  .commit();
