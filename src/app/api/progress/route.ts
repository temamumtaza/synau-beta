import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { mastra } from '@/mastra';
import { z } from 'zod';

const progressSchema = z.object({
  courseId: z.string(),
  quizAttempts: z.array(
    z.object({
      quizType: z.enum(['lesson', 'chapter', 'final']),
      score: z.number(),
      passed: z.boolean(),
      topic: z.string(),
    })
  ),
  lessonsCompleted: z.number(),
  totalLessons: z.number(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { quizAttempts, lessonsCompleted, totalLessons } = parsed.data;

  try {
    const agent = mastra.getAgent('progressAgent');
    const masterySchema = z.object({
      masteryScore: z.number(),
      lessonCompletionRate: z.number(),
      quizAverageScore: z.number(),
      weakTopics: z.array(z.string()),
      strongTopics: z.array(z.string()),
      recommendations: z.array(z.string()),
      nextSteps: z.string(),
    });

    const result = await agent.generate(
      `
Calculate mastery score and learning analytics for this student.

Lessons completed: ${lessonsCompleted} / ${totalLessons}
Quiz attempts: ${JSON.stringify(quizAttempts, null, 2)}

Return ONLY valid JSON.
      `.trim(),
      { structuredOutput: { schema: masterySchema } }
    );

    return NextResponse.json({ data: result.object }, { status: 200 });
  } catch (err) {
    console.error('[POST /api/progress] error:', err);
    return NextResponse.json(
      { error: 'Progress calculation failed', message: (err as Error).message },
      { status: 500 }
    );
  }
}
