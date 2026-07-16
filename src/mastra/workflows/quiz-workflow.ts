import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

// ─── Quiz Workflow ─────────────────────────────────────────────────────────
// Flow: Generate quiz questions from lesson/chapter content.
// Evaluation of answers is done client-side after the student completes the quiz.

// ─── Step 1: Generate Quiz ─────────────────────────────────────────────────

const generateQuizStep = createStep({
  id: 'generateQuiz',
  description: 'Quiz Agent creates questions from lesson/chapter content',
  inputSchema: z.object({
    sourceId: z.string(),
    sourceType: z.enum(['lesson', 'chapter', 'final']),
    content: z.any(),
    courseTitle: z.string(),
  }),
  outputSchema: z.object({
    sourceId: z.string(),
    sourceType: z.enum(['lesson', 'chapter', 'final']),
    quiz: z.object({
      type: z.enum(['lesson', 'chapter', 'final']),
      passingScore: z.number(),
      questions: z.array(
        z.object({
          id: z.string(),
          text: z.string(),
          options: z.array(z.object({ id: z.string(), text: z.string() })),
          correctOptionId: z.string(),
          explanation: z.string(),
          order: z.number(),
        })
      ),
    }),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('quizAgent');
    if (!agent) throw new Error('quizAgent not found');

    const quizSchema = z.object({
      type: z.enum(['lesson', 'chapter', 'final']),
      passingScore: z.number(),
      questions: z.array(
        z.object({
          text: z.string(),
          options: z.array(z.object({ id: z.string(), text: z.string() })),
          correctOptionId: z.string(),
          explanation: z.string(),
          order: z.number(),
        })
      ),
    });

    const questionCount =
      inputData.sourceType === 'lesson'
        ? 5
        : inputData.sourceType === 'chapter'
        ? 10
        : 20;

    const passingScore =
      inputData.sourceType === 'lesson' ? 60 : 70;

    const prompt = `
Create a ${inputData.sourceType} quiz with ${questionCount} questions.
Passing score: ${passingScore}%.

Content to test:
${JSON.stringify(inputData.content, null, 2)}

Return ONLY valid JSON matching the quiz schema.
    `.trim();

    const result = await agent.generate(prompt, {
      structuredOutput: { schema: quizSchema },
    });

    const raw = result.object as z.infer<typeof quizSchema>;

    // Assign IDs to questions for client-side tracking
    const questionsWithIds = raw.questions.map((q, i) => ({
      ...q,
      id: `q-${i + 1}`,
    }));

    return {
      sourceId: inputData.sourceId,
      sourceType: inputData.sourceType,
      quiz: {
        type: raw.type,
        passingScore: raw.passingScore,
        questions: questionsWithIds,
      },
    };
  },
});

// ─── Step 2: Generate Adaptive Lesson (for failed attempts) ────────────────

const generateAdaptiveLessonStep = createStep({
  id: 'generateAdaptiveLesson',
  description: 'Adaptive Learning Agent generates content for weak areas (optional, used on retry)',
  inputSchema: z.object({
    sourceId: z.string(),
    sourceType: z.enum(['lesson', 'chapter', 'final']),
    quiz: z.object({
      type: z.enum(['lesson', 'chapter', 'final']),
      passingScore: z.number(),
      questions: z.array(z.any()),
    }),
  }),
  outputSchema: z.object({
    sourceId: z.string(),
    quiz: z.any(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('adaptiveLearningAgent');
    if (!agent) throw new Error('adaptiveLearningAgent not found');

    const adaptiveSchema = z.object({
      adaptiveContent: z.object({
        introduction: z.string(),
        misconceptions: z.array(z.any()),
        simplifiedExplanations: z.array(z.any()),
        keyTakeaways: z.array(z.string()),
        encouragement: z.string(),
      }),
    });

    const prompt = `
Pre-generate adaptive learning hints for a ${inputData.sourceType} quiz.
If a student fails, these hints will help them understand the concepts better.

Quiz questions:
${JSON.stringify(inputData.quiz.questions, null, 2)}

Return ONLY valid JSON matching the adaptive content schema.
    `.trim();

    const result = await agent.generate(prompt, {
      structuredOutput: { schema: adaptiveSchema },
    });

    const adaptive = result.object as z.infer<typeof adaptiveSchema>;

    return {
      sourceId: inputData.sourceId,
      quiz: {
        ...inputData.quiz,
        adaptiveContent: adaptive.adaptiveContent,
      },
    };
  },
});

// ─── Workflow: Quiz ────────────────────────────────────────────────────────

export const quizWorkflow = createWorkflow({
  id: 'quizWorkflow',
  inputSchema: z.object({
    sourceId: z.string(),
    sourceType: z.enum(['lesson', 'chapter', 'final']),
    content: z.any(),
    courseTitle: z.string(),
  }),
  outputSchema: z.object({
    sourceId: z.string(),
    quiz: z.any(),
  }),
})
  .then(generateQuizStep)
  .then(generateAdaptiveLessonStep)
  .commit();
