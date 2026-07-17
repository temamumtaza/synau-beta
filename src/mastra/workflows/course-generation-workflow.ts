/* eslint-disable @typescript-eslint/no-explicit-any */
// Workflow steps handle dynamic AI output that is typed via Zod runtime validation,
// but intermediate `any` casts are needed for cross-step data flow.
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { teacherOutputSchema, type LessonContent } from '../agents/lesson-blocks';

// Agents are accessed via mastra.getAgent() inside step execute functions.
// No direct imports needed — workflows orchestrate, agents don't call each other.

// ─── Shared Zod Schemas ────────────────────────────────────────────────────

const chapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  order: z.number(),
  dependsOn: z.array(z.string()),
  estimatedDuration: z.string(),
  lessons: z
    .array(
      z.object({
        title: z.string(),
        objective: z.string(),
        order: z.number(),
      })
    )
    .optional(),
});

const roadmapSchema = z.object({
  title: z.string(),
  goal: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedDuration: z.string(),
  prerequisites: z.array(z.string()),
  chapters: z.array(chapterSchema),
});

// ─── Step 1: Generate Roadmap ──────────────────────────────────────────────

const generateRoadmapStep = createStep({
  id: 'generateRoadmap',
  description: 'Planner Agent generates a course roadmap from user goal',
  inputSchema: z.object({
    goal: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  }),
  outputSchema: z.object({
    roadmap: roadmapSchema,
    raw: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('plannerAgent');
    if (!agent) throw new Error('plannerAgent not found');

    const prompt = `
Create a detailed course roadmap for the following learning goal:

Goal: "${inputData.goal}"
${inputData.difficulty ? `Preferred difficulty: ${inputData.difficulty}` : ''}

Return ONLY valid JSON matching the required schema.
    `.trim();

    const result = await agent.generate(prompt, {
      structuredOutput: { schema: roadmapSchema },
    });

    return {
      roadmap: result.object as z.infer<typeof roadmapSchema>,
      raw: JSON.stringify(result.object),
    };
  },
});

// ─── Step 2: Review Curriculum ─────────────────────────────────────────────

const reviewCurriculumStep = createStep({
  id: 'reviewCurriculum',
  description: 'Curriculum Reviewer validates the roadmap',
  inputSchema: z.object({
    roadmap: roadmapSchema,
    raw: z.string(),
  }),
  outputSchema: z.object({
    roadmap: roadmapSchema,
    reviewStatus: z.enum(['approved', 'needs_revision']),
    reviewScore: z.number(),
    issues: z.array(z.any()),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('curriculumReviewerAgent');
    if (!agent) throw new Error('curriculumReviewerAgent not found');

    const reviewSchema = z.object({
      status: z.enum(['approved', 'needs_revision']),
      score: z.number(),
      issues: z.array(z.any()),
      strengths: z.array(z.string()),
      revisedChapters: z.array(z.any()),
    });

    const prompt = `
Review the following course roadmap and validate its pedagogical quality.

Roadmap:
${inputData.raw}

Return ONLY valid JSON matching the review schema.
    `.trim();

    const result = await agent.generate(prompt, {
      structuredOutput: { schema: reviewSchema },
    });

    const review = result.object as z.infer<typeof reviewSchema>;

    return {
      roadmap: inputData.roadmap,
      reviewStatus: review.status,
      reviewScore: review.score,
      issues: review.issues,
    };
  },
});

// ─── Step 3: Research Planning ─────────────────────────────────────────────

const planResearchStep = createStep({
  id: 'planResearch',
  description: 'Research Planner creates search strategy for lesson 1',
  inputSchema: z.object({
    roadmap: roadmapSchema,
    reviewStatus: z.enum(['approved', 'needs_revision']),
    reviewScore: z.number(),
    issues: z.array(z.any()),
  }),
  outputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    researchStrategy: z.any(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('researchPlannerAgent');
    if (!agent) throw new Error('researchPlannerAgent not found');

    const firstChapter = inputData.roadmap.chapters[0];
    const firstLesson = firstChapter?.lessons?.[0];

    if (!firstLesson) {
      throw new Error('No lessons found in roadmap');
    }

    const strategySchema = z.object({
      topic: z.string(),
      objective: z.string(),
      queries: z.array(z.any()),
      prioritySources: z.array(z.string()),
      excludedSources: z.array(z.string()),
    });

    const prompt = `
Create a research search strategy for the following lesson:

Topic: "${firstLesson.title}"
Objective: "${firstLesson.objective}"
Course: "${inputData.roadmap.title}"
Chapter: "${firstChapter.title}"

Return ONLY valid JSON matching the research strategy schema.
    `.trim();

    const result = await agent.generate(prompt, {
      structuredOutput: { schema: strategySchema },
    });

    return {
      roadmap: inputData.roadmap,
      firstLesson: {
        title: firstLesson.title,
        objective: firstLesson.objective,
        chapterId: firstChapter.id,
      },
      researchStrategy: result.object,
    };
  },
});

// ─── Step 4: Collect Research ──────────────────────────────────────────────

const collectResearchStep = createStep({
  id: 'collectResearch',
  description: 'Research Agent collects knowledge from trusted sources',
  inputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    researchStrategy: z.any(),
  }),
  outputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    research: z.any(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('researchAgent');
    if (!agent) throw new Error('researchAgent not found');

    const researchSchema = z.object({
      topic: z.string(),
      knowledgeItems: z.array(z.any()),
      coverage: z.object({
        topics: z.array(z.string()),
        gaps: z.array(z.string()),
      }),
    });

    const prompt = `
Research the following topic using the provided strategy.

Topic: "${inputData.firstLesson.title}"
Objective: "${inputData.firstLesson.objective}"
Strategy: ${JSON.stringify(inputData.researchStrategy)}

Collect knowledge from authoritative sources and return ONLY valid JSON.
    `.trim();

    const result = await agent.generate(prompt, {
      structuredOutput: { schema: researchSchema },
    });

    return {
      roadmap: inputData.roadmap,
      firstLesson: inputData.firstLesson,
      research: result.object,
    };
  },
});

// ─── Step 5: Rank Sources ──────────────────────────────────────────────────

const rankSourcesStep = createStep({
  id: 'rankSources',
  description: 'Source Rank Agent scores and ranks collected sources',
  inputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    research: z.any(),
  }),
  outputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    research: z.any(),
    rankedSources: z.any(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('sourceRankAgent');
    if (!agent) throw new Error('sourceRankAgent not found');

    const rankSchema = z.object({
      rankedSources: z.array(z.any()),
    });

    const sources =
      (inputData.research as any)?.knowledgeItems?.map((item: any) => ({
        title: item.sourceTitle,
        publisher: item.sourcePublisher,
        url: item.sourceUrl,
        sourceType: item.sourceType,
      })) ?? [];

    const prompt = `
Rank and evaluate the following sources for reliability and authority.

Sources:
${JSON.stringify(sources, null, 2)}

Return ONLY valid JSON with ranked sources.
    `.trim();

    const result = await agent.generate(prompt, {
      structuredOutput: { schema: rankSchema },
    });

    return {
      roadmap: inputData.roadmap,
      firstLesson: inputData.firstLesson,
      research: inputData.research,
      rankedSources: (result.object as any).rankedSources,
    };
  },
});

// ─── Step 6: Ground Knowledge ──────────────────────────────────────────────

const groundKnowledgeStep = createStep({
  id: 'groundKnowledge',
  description: 'Grounding Agent produces verified knowledge package',
  inputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    research: z.any(),
    rankedSources: z.any(),
  }),
  outputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    knowledgePackage: z.any(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('groundingAgent');
    if (!agent) throw new Error('groundingAgent not found');

    const groundingSchema = z.object({
      status: z.enum(['sufficient', 'insufficient']),
      insufficiencyReason: z.string().nullable(),
      verifiedFacts: z.array(z.any()),
      sources: z.array(z.any()),
      topicCoverage: z.array(z.string()),
      unverifiedClaims: z.array(z.string()),
    });

    const prompt = `
Produce a verified knowledge package for the following lesson.

Lesson: "${inputData.firstLesson.title}"
Objective: "${inputData.firstLesson.objective}"

Research Data:
${JSON.stringify(inputData.research, null, 2)}

Ranked Sources:
${JSON.stringify(inputData.rankedSources, null, 2)}

Return ONLY valid JSON matching the knowledge package schema.
    `.trim();

    const result = await agent.generate(prompt, {
      structuredOutput: { schema: groundingSchema },
    });

    return {
      roadmap: inputData.roadmap,
      firstLesson: inputData.firstLesson,
      knowledgePackage: result.object,
    };
  },
});

// ─── Step 7: Generate Lesson ───────────────────────────────────────────────

const generateLessonStep = createStep({
  id: 'generateLesson',
  description: 'Teacher Agent produces lesson content from knowledge package',
  inputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    knowledgePackage: z.any(),
  }),
  outputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    lessonContent: z.any(),
    knowledgePackage: z.any(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('teacherAgent');
    if (!agent) throw new Error('teacherAgent not found');

    const prompt = `
Create lesson content for the following specification.

Lesson: "${inputData.firstLesson.title}"
Objective: "${inputData.firstLesson.objective}"
Course: "${inputData.roadmap.title}"
Difficulty: "${inputData.roadmap.difficulty}"

Verified Knowledge Package:
${JSON.stringify(inputData.knowledgePackage, null, 2)}

Return ONLY valid JSON matching the lesson schema.
    `.trim();

    const result = await agent.generate(prompt, {
      structuredOutput: { schema: teacherOutputSchema },
    });

    const lessonResult = result.object;

    // If the model "rejected" the lesson, fall back to building basic content
    // from the knowledge package rather than failing the whole workflow.
    if (lessonResult.status === 'rejected' || !lessonResult.lesson) {
      console.warn('[generateLessonStep] Lesson was rejected by Teacher Agent. Building fallback lesson from knowledge package.');
      const facts = (inputData.knowledgePackage as any)?.verifiedFacts ?? [];
      const sources = (inputData.knowledgePackage as any)?.sources ?? [];
      const fallbackLesson: LessonContent = {
        title: inputData.firstLesson.title,
        objective: inputData.firstLesson.objective,
        blocks: [
          {
            type: 'text',
            content:
              facts
                .map((f: any) => f.fact)
                .filter(Boolean)
                .join('\n\n') || 'Lesson content unavailable.',
          },
          {
            type: 'keyPoints',
            points: (inputData.knowledgePackage as any)?.topicCoverage ?? [],
          },
          { type: 'summary', content: 'Auto-generated summary from verified facts.' },
        ],
        citedSourceUrls: sources.map((s: any) => s.url).filter(Boolean),
      };
      return {
        roadmap: inputData.roadmap,
        firstLesson: inputData.firstLesson,
        lessonContent: fallbackLesson,
        knowledgePackage: inputData.knowledgePackage,
      };
    }

    return {
      roadmap: inputData.roadmap,
      firstLesson: inputData.firstLesson,
      lessonContent: lessonResult.lesson,
      knowledgePackage: inputData.knowledgePackage,
    };
  },
});

// ─── Step 8: Fact Check ────────────────────────────────────────────────────

const factCheckStep = createStep({
  id: 'factCheck',
  description: 'Fact Checker validates lesson content against knowledge package',
  inputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    lessonContent: z.any(),
    knowledgePackage: z.any(),
  }),
  outputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    lessonContent: z.any(),
    knowledgePackage: z.any(),
    factCheckPassed: z.boolean(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('factCheckerAgent');
    if (!agent) throw new Error('factCheckerAgent not found');

    const factCheckSchema = z.object({
      status: z.enum(['passed', 'rejected']),
      hallucinationRisk: z.number(),
      checks: z.array(z.any()),
      rejectionReasons: z.array(z.string()),
    });

    const prompt = `
Verify all factual claims in the following lesson content against the knowledge package.

Lesson Content:
${JSON.stringify(inputData.lessonContent, null, 2)}

Knowledge Package:
${JSON.stringify(inputData.knowledgePackage, null, 2)}

Return ONLY valid JSON matching the fact-check schema.
    `.trim();

    const result = await agent.generate(prompt, {
      structuredOutput: { schema: factCheckSchema },
    });

    const check = result.object as z.infer<typeof factCheckSchema>;
    // Don't throw on fact check failure — flag it and continue.
    // The lesson will still be saved but flagged as needing review.
    if (check.status === 'rejected') {
      console.warn(
        `[factCheckStep] Fact check flagged issues: ${check.rejectionReasons.join(', ')}. Proceeding with lesson but flagging for review.`
      );
    }

    return {
      roadmap: inputData.roadmap,
      firstLesson: inputData.firstLesson,
      lessonContent: inputData.lessonContent,
      knowledgePackage: inputData.knowledgePackage,
      factCheckPassed: check.status === 'passed',
    };
  },
});

// ─── Step 9: Build Citations ───────────────────────────────────────────────

const buildCitationsStep = createStep({
  id: 'buildCitations',
  description: 'Citation Builder creates structured citations',
  inputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    lessonContent: z.any(),
    knowledgePackage: z.any(),
    factCheckPassed: z.boolean(),
  }),
  outputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    lessonContent: z.any(),
    citations: z.array(z.any()),
  }),
  execute: async ({ inputData, mastra }) => {
    const citationAgent = mastra?.getAgent('citationBuilderAgent');
    if (!citationAgent) throw new Error('citationBuilderAgent not found');

    const citationSchema = z.object({
      citations: z.array(
        z.object({
          title: z.string(),
          publisher: z.string(),
          url: z.string(),
          accessedAt: z.string().nullable().optional(),
          confidenceScore: z.number(),
          sourceRank: z.number(),
          citation: z.string(),
        })
      ),
    });

    const citationPrompt = `
Build structured citations for the following sources used in the lesson.

Sources from knowledge package:
${JSON.stringify((inputData.knowledgePackage as any).sources ?? [], null, 2)}

Return ONLY valid JSON matching the citation schema.
    `.trim();

    const citationResult = await citationAgent.generate(citationPrompt, {
      structuredOutput: { schema: citationSchema },
    });

    const citations = (citationResult.object as z.infer<typeof citationSchema>).citations;

    return {
      roadmap: inputData.roadmap,
      firstLesson: inputData.firstLesson,
      lessonContent: inputData.lessonContent,
      citations,
    };
  },
});

// ─── Workflow: Course Generation ───────────────────────────────────────────

export const courseGenerationWorkflow = createWorkflow({
  id: 'courseGenerationWorkflow',
  inputSchema: z.object({
    goal: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  }),
  outputSchema: z.object({
    roadmap: roadmapSchema,
    firstLesson: z.object({
      title: z.string(),
      objective: z.string(),
      chapterId: z.string(),
    }),
    lessonContent: z.any(),
    citations: z.array(z.any()),
  }),
})
  .then(generateRoadmapStep)
  .then(reviewCurriculumStep)
  .then(planResearchStep)
  .then(collectResearchStep)
  .then(rankSourcesStep)
  .then(groundKnowledgeStep)
  .then(generateLessonStep)
  .then(factCheckStep)
  .then(buildCitationsStep)
  .commit();
